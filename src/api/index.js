const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// GET /tasks — list all tasks with optional filtering
app.get('/tasks', async (req, res) => {
  const { priority, completed } = req.query;
  
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  
  if (priority) {
    const validPriorities = ['low', 'medium', 'high'];
    if (validPriorities.includes(priority)) {
      query += ' AND priority = $' + (params.length + 1);
      params.push(priority);
      console.log(`[GET /tasks] Filtering by priority: ${priority}`);
    }
  }
  
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    query += ' AND completed = $' + (params.length + 1);
    params.push(isCompleted);
    console.log(`[GET /tasks] Filtering by completed: ${isCompleted}`);
  }
  
  query += ' ORDER BY created_at ASC';
  
  const { rows } = await db.query(query, params);
  console.log(`[GET /tasks] Returned ${rows.length} task(s)`);
  res.json(rows);
});

// POST /tasks — create a task
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

// PATCH /tasks/:id — update a task (complete/uncomplete, rename, or change priority)
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

// DELETE /tasks/:id — delete a task
app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  console.log(`[DELETE /tasks/:id] Deleted task ${id}`);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
