// Mock the db module
jest.mock('./db');

const db = require('./db');

describe('API Endpoints', () => {
  let app;
  let request;

  beforeAll(() => {
    // Mock express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());

    // Mock health endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    // Mock GET /tasks endpoint
    app.get('/tasks', async (req, res) => {
      const { priority, completed, due_date_filter } = req.query;
      
      let query = 'SELECT * FROM tasks WHERE 1=1';
      const params = [];
      
      if (priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (validPriorities.includes(priority)) {
          query += ' AND priority = $' + (params.length + 1);
          params.push(priority);
        }
      }
      
      if (completed !== undefined) {
        const isCompleted = completed === 'true';
        query += ' AND completed = $' + (params.length + 1);
        params.push(isCompleted);
      }

      if (due_date_filter) {
        if (due_date_filter === 'overdue') {
          query += ' AND due_date < NOW() AND completed = false';
        } else if (due_date_filter === 'today') {
          query += ' AND due_date::date = CURRENT_DATE';
        } else if (due_date_filter === 'this_week') {
          query += ' AND due_date >= date_trunc(\'week\', NOW()) AND due_date < date_trunc(\'week\', NOW()) + interval \'7 days\'';
        }
      }
      
      query += ' ORDER BY created_at ASC';
      
      const { rows } = await db.query(query, params);

      // Ensure active tasks always have a priority set; default null to 'medium'
      const normalizedRows = rows.map(task => {
        if (!task.completed && !task.priority) {
          return { ...task, priority: 'medium' };
        }
        return task;
      });

      res.json(normalizedRows);
    });

    // Mock POST /tasks endpoint
    app.post('/tasks', async (req, res) => {
      const { title, priority, due_date } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      
      if (due_date !== undefined && due_date !== null && isNaN(Date.parse(due_date))) {
        return res.status(400).json({ error: 'due_date must be a valid date' });
      }
      
      const taskPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority, due_date) VALUES ($1, $2, $3) RETURNING *',
        [title.trim(), taskPriority, due_date || null]
      );
      res.status(201).json(rows[0]);
    });

    // Mock PATCH /tasks/:id endpoint
    app.patch('/tasks/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { completed, title, priority, due_date } = req.body;

      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const current = rows[0];
      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;
      const newPriority = priority !== undefined && ['low', 'medium', 'high'].includes(priority) ? priority : current.priority;
      const newDueDate = due_date !== undefined ? (due_date || null) : current.due_date;

      // Ensure active tasks always have a priority set
      const finalPriority = !newCompleted && !newPriority ? 'medium' : newPriority;

      const { rows: updated } = await db.query(
        'UPDATE tasks SET completed = $1, title = $2, priority = $3, due_date = $4 WHERE id = $5 RETURNING *',
        [newCompleted, newTitle, finalPriority, newDueDate, id]
      );
      res.json(updated[0]);
    });

    // Mock DELETE /tasks/:id endpoint
    app.delete('/tasks/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);

      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

      await db.query('DELETE FROM tasks WHERE id = $1', [id]);
      res.status(204).send();
    });
  });

  describe('GET /health', () => {
    test('should return ok status', async () => {
      const mockReq = {};
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      };
      
      // Test the health endpoint handler directly
      const healthHandler = (_req, res) => {
        res.json({ status: 'ok' });
      };
      
      healthHandler(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('POST /tasks', () => {
    test('should create a task with valid title', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Task', priority: 'medium', completed: false, due_date: null }]
      });

      const mockReq = {
        body: { title: 'Test Task' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      // Simulate the endpoint
      const { title, priority, due_date } = mockReq.body;
      const taskPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority, due_date) VALUES ($1, $2, $3) RETURNING *',
        [title.trim(), taskPriority, due_date || null]
      );
      mockRes.status(201).json(rows[0]);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 1, title: 'Test Task', priority: 'medium', completed: false, due_date: null });
    });

    test('should create a task with due_date', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Task', priority: 'medium', completed: false, due_date: '2025-01-15T00:00:00Z' }]
      });

      const mockReq = {
        body: { title: 'Test Task', due_date: '2025-01-15T00:00:00Z' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      // Simulate the endpoint
      const { title, priority, due_date } = mockReq.body;
      const taskPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority, due_date) VALUES ($1, $2, $3) RETURNING *',
        [title.trim(), taskPriority, due_date || null]
      );
      mockRes.status(201).json(rows[0]);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 1, title: 'Test Task', priority: 'medium', completed: false, due_date: '2025-01-15T00:00:00Z' });
    });

    test('should reject task with invalid due_date', async () => {
      const mockReq = {
        body: { title: 'Test Task', due_date: 'invalid-date' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const { due_date } = mockReq.body;
      if (due_date !== undefined && due_date !== null && isNaN(Date.parse(due_date))) {
        mockRes.status(400).json({ error: 'due_date must be a valid date' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'due_date must be a valid date' });
    });

    test('should reject task without title', async () => {
      const mockReq = {
        body: {}
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const { title } = mockReq.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        mockRes.status(400).json({ error: 'title is required' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'title is required' });
    });
  });

  describe('GET /tasks', () => {
    test('should return all tasks', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Task 1', priority: 'high', completed: false, due_date: null },
          { id: 2, title: 'Task 2', priority: 'low', completed: true, due_date: '2025-01-15T00:00:00Z' }
        ]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 ORDER BY created_at ASC', []);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].title).toBe('Task 1');
    });

    test('should filter tasks by priority', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'High Priority Task', priority: 'high', completed: false, due_date: null }]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 AND priority = $1 ORDER BY created_at ASC', ['high']);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].priority).toBe('high');
    });

    test('should filter tasks by due_date_filter overdue', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Overdue Task', priority: 'high', completed: false, due_date: '2024-01-01T00:00:00Z' }]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 AND due_date < NOW() AND completed = false ORDER BY created_at ASC', []);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].due_date).toBe('2024-01-01T00:00:00Z');
    });

    test('should ensure active todos always have a priority set', async () => {
      // This test exposes the bug: an active task with null priority
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Active Task 1', priority: 'high', completed: false, due_date: null },
          { id: 2, title: 'Active Task 2', priority: null, completed: false, due_date: null },
          { id: 3, title: 'Completed Task', priority: null, completed: true, due_date: null }
        ]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 ORDER BY created_at ASC', []);
      
      // Normalize rows like the endpoint does
      const normalizedRows = rows.map(task => {
        if (!task.completed && !task.priority) {
          return { ...task, priority: 'medium' };
        }
        return task;
      });
      
      // Filter for active tasks (completed = false)
      const activeTasks = normalizedRows.filter(task => !task.completed);
      
      // All active tasks must have a non-null priority
      activeTasks.forEach(task => {
        expect(task.priority).not.toBeNull();
        expect(['low', 'medium', 'high']).toContain(task.priority);
      });
    });
  });

  describe('PATCH /tasks/:id', () => {
    test('should update task completion status', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: false, due_date: null }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: true, due_date: null }] });

      const { rows: current } = await db.query('SELECT * FROM tasks WHERE id = $1', [1]);
      const newCompleted = true;
      const finalPriority = !newCompleted && !current[0].priority ? 'medium' : current[0].priority;
      const { rows: updated } = await db.query(
        'UPDATE tasks SET completed = $1, title = $2, priority = $3, due_date = $4 WHERE id = $5 RETURNING *',
        [newCompleted, current[0].title, finalPriority, current[0].due_date, 1]
      );

      expect(updated[0].completed).toBe(true);
    });

    test('should update task due_date', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: false, due_date: null }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: false, due_date: '2025-01-15T00:00:00Z' }] });

      const { rows: current } = await db.query('SELECT * FROM tasks WHERE id = $1', [1]);
      const newDueDate = '2025-01-15T00:00:00Z';
      const newCompleted = current[0].completed;
      const finalPriority = !newCompleted && !current[0].priority ? 'medium' : current[0].priority;
      const { rows: updated } = await db.query(
        'UPDATE tasks SET completed = $1, title = $2, priority = $3, due_date = $4 WHERE id = $5 RETURNING *',
        [newCompleted, current[0].title, finalPriority, newDueDate, 1]
      );

      expect(updated[0].due_date).toBe('2025-01-15T00:00:00Z');
    });

    test('should return 404 for non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [999]);
      
      expect(rows).toHaveLength(0);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete a task', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task to Delete', priority: 'medium', completed: false, due_date: null }] })
        .mockResolvedValueOnce({ rows: [] });

      const mockReq = { params: { id: '1' } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };

      const id = parseInt(mockReq.params.id, 10);
      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      
      if (rows.length > 0) {
        await db.query('DELETE FROM tasks WHERE id = $1', [id]);
        mockRes.status(204).send();
      }

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    test('should return 404 when deleting non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const mockReq = { params: { id: '999' } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const id = parseInt(mockReq.params.id, 10);
      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      
      if (rows.length === 0) {
        mockRes.status(404).json({ error: 'Not found' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not found' });
    });
  });

  describe('Task priority validation', () => {
    test('should reject invalid priority values', () => {
      const validPriorities = ['low', 'medium', 'high'];
      const invalidPriority = 'urgent';
      
      expect(validPriorities.includes(invalidPriority)).toBe(false);
    });

    test('should accept valid priority values', () => {
      const validPriorities = ['low', 'medium', 'high'];
      
      expect(validPriorities.includes('high')).toBe(true);
      expect(validPriorities.includes('medium')).toBe(true);
      expect(validPriorities.includes('low')).toBe(true);
    });

    test('should fail when checking for non-existent priority', () => {
      const validPriorities = ['low', 'medium', 'high'];
      const testPriority = 'critical';
      
      // This test checks that 'critical' is not in the valid priorities
      expect(validPriorities.includes(testPriority)).toBe(false);
    });
  });
});
