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
  const { priority, completed, due_date_filter } = req.query;
  
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

  if (due_date_filter) {
    if (due_date_filter === 'overdue') {
      query += ' AND due_date < NOW() AND completed = false';
      console.log(`[GET /tasks] Filtering by due_date_filter: overdue`);
    } else if (due_date_filter === 'today') {
      query += ' AND due_date::date = CURRENT_DATE';
      console.log(`[GET /tasks] Filtering by due_date_filter: today`);
    } else if (due_date_filter === 'this_week') {
      query += ' AND due_date >= date_trunc(\'week\', NOW()) AND due_date < date_trunc(\'week\', NOW()) + interval \'7 days\'';
      console.log(`[GET /tasks] Filtering by due_date_filter: this_week`);
    }
  }
  
  query += ' ORDER BY created_at ASC';
  
  const { rows } = await db.query(query, params);
  console.log(`[GET /tasks] Returned ${rows.length} task(s)`);
  res.json(rows);
});

// POST /tasks — create a task
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

// PATCH /tasks/:id — update a task (complete/uncomplete, rename, change priority, or update due_date)
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

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2, priority = $3, due_date = $4 WHERE id = $5 RETURNING *',
    [newCompleted, newTitle, newPriority, newDueDate, id]
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
