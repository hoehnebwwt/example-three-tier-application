const request = require('supertest');
const express = require('express');
const db = require('../db');

// Mock the db module
jest.mock('../db');

// Create app for testing
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const { rows } = await db.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

app.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed, title } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *',
    [newCompleted, newTitle, id]
  );
  res.json(updated[0]);
});

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
        { id: 2, title: 'Task 2', completed: true, created_at: '2024-01-02' },
      ];
      db.query.mockResolvedValue({ rows: mockTasks });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTasks);
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM tasks ORDER BY created_at ASC');
    });

    it('should return empty array when no tasks exist', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with valid title', async () => {
      const newTask = { id: 1, title: 'New Task', completed: false, created_at: '2024-01-01' };
      db.query.mockResolvedValue({ rows: [newTask] });

      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(newTask);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
        ['New Task']
      );
    });

    it('should trim whitespace from title', async () => {
      const newTask = { id: 1, title: 'Trimmed Task', completed: false, created_at: '2024-01-01' };
      db.query.mockResolvedValue({ rows: [newTask] });

      const res = await request(app)
        .post('/tasks')
        .send({ title: '  Trimmed Task  ' });

      expect(res.status).toBe(201);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
        ['Trimmed Task']
      );
    });

    it('should reject empty title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'title is required' });
    });

    it('should reject whitespace-only title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'title is required' });
    });

    it('should reject missing title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'title is required' });
    });

    it('should reject non-string title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'title is required' });
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should toggle task completion', async () => {
      const existingTask = { id: 1, title: 'Task', completed: false, created_at: '2024-01-01' };
      const updatedTask = { id: 1, title: 'Task', completed: true, created_at: '2024-01-01' };

      db.query
        .mockResolvedValueOnce({ rows: [existingTask] })
        .mockResolvedValueOnce({ rows: [updatedTask] });

      const res = await request(app)
        .patch('/tasks/1')
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedTask);
    });

    it('should update task title', async () => {
      const existingTask = { id: 1, title: 'Old Title', completed: false, created_at: '2024-01-01' };
      const updatedTask = { id: 1, title: 'New Title', completed: false, created_at: '2024-01-01' };

      db.query
        .mockResolvedValueOnce({ rows: [existingTask] })
        .mockResolvedValueOnce({ rows: [updatedTask] });

      const res = await request(app)
        .patch('/tasks/1')
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedTask);
    });

    it('should update both title and completion', async () => {
      const existingTask = { id: 1, title: 'Old Title', completed: false, created_at: '2024-01-01' };
      const updatedTask = { id: 1, title: 'New Title', completed: true, created_at: '2024-01-01' };

      db.query
        .mockResolvedValueOnce({ rows: [existingTask] })
        .mockResolvedValueOnce({ rows: [updatedTask] });

      const res = await request(app)
        .patch('/tasks/1')
        .send({ title: 'New Title', completed: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedTask);
    });

    it('should return 404 for non-existent task', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .patch('/tasks/999')
        .send({ completed: true });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    it('should preserve existing values when not provided', async () => {
      const existingTask = { id: 1, title: 'Task', completed: true, created_at: '2024-01-01' };

      db.query
        .mockResolvedValueOnce({ rows: [existingTask] })
        .mockResolvedValueOnce({ rows: [existingTask] });

      const res = await request(app)
        .patch('/tasks/1')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual(existingTask);
    });
  });
});
