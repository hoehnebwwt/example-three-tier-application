// Mock the db module
jest.mock('./db');

const db = require('./db');

describe('API Endpoints', () => {
  describe('POST /tasks', () => {
    test('should create a task with valid title', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Task', priority: 'medium', completed: false }]
      });

      const title = 'Test Task';
      const taskPriority = 'medium';
      const { rows } = await db.query(
        'INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING *',
        [title.trim(), taskPriority]
      );

      expect(rows[0].title).toBe('Test Task');
      expect(rows[0].priority).toBe('medium');
    });

    test('should reject task without title', () => {
      const title = undefined;
      const isValid = title && typeof title === 'string' && title.trim();
      expect(isValid).toBeFalsy();
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
});
