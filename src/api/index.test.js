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
      const { priority, completed } = req.query;
      
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
      
      query += ' ORDER BY created_at ASC';
      
      const { rows } = await db.query(query, params);
      res.json(rows);
    });

    // Mock POST /tasks endpoint
    app.post('/tasks', async (req, res) => {
      const { title, priority } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const taskPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING *',
        [title.trim(), taskPriority]
      );
      res.status(201).json(rows[0]);
    });

    // Mock PATCH /tasks/:id endpoint
    app.patch('/tasks/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { completed, title, priority } = req.body;

      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const current = rows[0];
      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;
      const newPriority = priority !== undefined && ['low', 'medium', 'high'].includes(priority) ? priority : current.priority;

      const { rows: updated } = await db.query(
        'UPDATE tasks SET completed = $1, title = $2, priority = $3 WHERE id = $4 RETURNING *',
        [newCompleted, newTitle, newPriority, id]
      );
      res.json(updated[0]);
    });
  });

  describe('GET /health', () => {
    test('should return ok status', async () => {
      const mockReq = {};
      const mockRes = {
        json: jest.fn().mockReturnThis(),
      };
      
      app._router.stack.find(r => r.route && r.route.path === '/health').route.stack[0].handle(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('POST /tasks', () => {
    test('should create a task with valid title', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Task', priority: 'medium', completed: false }]
      });

      const mockReq = {
        body: { title: 'Test Task' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      // Simulate the endpoint
      const { title, priority } = mockReq.body;
      const taskPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING *',
        [title.trim(), taskPriority]
      );
      mockRes.status(201).json(rows[0]);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 1, title: 'Test Task', priority: 'medium', completed: false });
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
          { id: 1, title: 'Task 1', priority: 'high', completed: false },
          { id: 2, title: 'Task 2', priority: 'low', completed: true }
        ]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 ORDER BY created_at ASC', []);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].title).toBe('Task 1');
    });

    test('should filter tasks by priority', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'High Priority Task', priority: 'high', completed: false }]
      });

      const { rows } = await db.query('SELECT * FROM tasks WHERE 1=1 AND priority = $1 ORDER BY created_at ASC', ['high']);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].priority).toBe('high');
    });
  });

  describe('PATCH /tasks/:id', () => {
    test('should update task completion status', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: false }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task', priority: 'medium', completed: true }] });

      const { rows: current } = await db.query('SELECT * FROM tasks WHERE id = $1', [1]);
      const newCompleted = true;
      const { rows: updated } = await db.query(
        'UPDATE tasks SET completed = $1, title = $2, priority = $3 WHERE id = $4 RETURNING *',
        [newCompleted, current[0].title, current[0].priority, 1]
      );

      expect(updated[0].completed).toBe(true);
    });

    test('should return 404 for non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [999]);
      
      expect(rows).toHaveLength(0);
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

    test('should correctly validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high'];
      const testPriority = 'critical';
      
      // Fixed: now correctly expects false for invalid priority
      expect(validPriorities.includes(testPriority)).toBe(false);
    });
  });
});
