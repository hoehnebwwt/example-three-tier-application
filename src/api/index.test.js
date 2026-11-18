const request = require('supertest');
const express = require('express');
const db = require('./db');

// Mock the database module
jest.mock('./db');

// Create the app for testing
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// GET /tasks — list all tasks
app.get('/tasks', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

// POST /tasks — create a task
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

// PATCH /tasks/:id — update a task (complete/uncomplete or rename)
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

describe('API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: GET /health returns status ok
  test('GET /health should return status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  // Test 2: GET /tasks returns list of tasks
  test('GET /tasks should return list of tasks from database', async () => {
    const mockTasks = [
      { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
      { id: 2, title: 'Task 2', completed: true, created_at: '2024-01-02' }
    ];
    db.query.mockResolvedValue({ rows: mockTasks });

    const response = await request(app).get('/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockTasks);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM tasks ORDER BY created_at ASC');
  });

  // Test 3: POST /tasks with valid title creates a new task
  test('POST /tasks with valid title should create a new task', async () => {
    const newTask = { id: 3, title: 'New Task', completed: false, created_at: '2024-01-03' };
    db.query.mockResolvedValue({ rows: [newTask] });

    const response = await request(app)
      .post('/tasks')
      .send({ title: 'New Task' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(newTask);
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      ['New Task']
    );
  });

  // Test 4: POST /tasks with invalid title returns 400 error
  test('POST /tasks with invalid title should return 400 error', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
    expect(db.query).not.toHaveBeenCalled();
  });
});
