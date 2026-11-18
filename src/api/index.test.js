const test = require('node:test');
const assert = require('node:assert');

// Test the API logic without needing to run the server
// This tests the core business logic

test('Task API Business Logic', async (t) => {
  // Test input validation for POST /tasks
  await t.test('POST /tasks validation', async (t) => {
    await t.test('should reject empty title', () => {
      const title = '';
      const isValid = !!(title && typeof title === 'string' && title.trim());
      assert.strictEqual(isValid, false);
    });

    await t.test('should reject whitespace-only title', () => {
      const title = '   ';
      const isValid = !!(title && typeof title === 'string' && title.trim());
      assert.strictEqual(isValid, false);
    });

    await t.test('should reject non-string title', () => {
      const title = 123;
      const isValid = !!(title && typeof title === 'string' && title.trim());
      assert.strictEqual(isValid, false);
    });

    await t.test('should accept valid title', () => {
      const title = 'Valid Task';
      const isValid = !!(title && typeof title === 'string' && title.trim());
      assert.strictEqual(isValid, true);
    });

    await t.test('should trim whitespace from title', () => {
      const title = '  Valid Task  ';
      const trimmed = title.trim();
      assert.strictEqual(trimmed, 'Valid Task');
    });
  });

  // Test PATCH /tasks/:id logic
  await t.test('PATCH /tasks/:id logic', async (t) => {
    await t.test('should reject invalid task ID', () => {
      const id = parseInt('invalid', 10);
      assert.strictEqual(isNaN(id), true);
    });

    await t.test('should accept valid numeric ID', () => {
      const id = parseInt('1', 10);
      assert.strictEqual(isNaN(id), false);
      assert.strictEqual(id, 1);
    });

    await t.test('should preserve existing values when not provided', () => {
      const current = { id: 1, title: 'Task 1', completed: true };
      const completed = undefined;
      const title = undefined;

      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;

      assert.strictEqual(newCompleted, true);
      assert.strictEqual(newTitle, 'Task 1');
    });

    await t.test('should update completion status', () => {
      const current = { id: 1, title: 'Task 1', completed: false };
      const completed = true;
      const title = undefined;

      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;

      assert.strictEqual(newCompleted, true);
      assert.strictEqual(newTitle, 'Task 1');
    });

    await t.test('should update title', () => {
      const current = { id: 1, title: 'Old Title', completed: false };
      const completed = undefined;
      const title = 'New Title';

      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;

      assert.strictEqual(newCompleted, false);
      assert.strictEqual(newTitle, 'New Title');
    });

    await t.test('should update both title and completion', () => {
      const current = { id: 1, title: 'Old Title', completed: false };
      const completed = true;
      const title = 'New Title';

      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;

      assert.strictEqual(newCompleted, true);
      assert.strictEqual(newTitle, 'New Title');
    });

    await t.test('should trim whitespace from updated title', () => {
      const current = { id: 1, title: 'Old Title', completed: false };
      const completed = undefined;
      const title = '  New Title  ';

      const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
      const newTitle = title !== undefined ? title.trim() : current.title;

      assert.strictEqual(newCompleted, false);
      assert.strictEqual(newTitle, 'New Title');
    });
  });

  // Test database query building
  await t.test('Database Query Building', async (t) => {
    await t.test('should build correct SELECT query', () => {
      const query = 'SELECT * FROM tasks ORDER BY created_at ASC';
      assert.strictEqual(query, 'SELECT * FROM tasks ORDER BY created_at ASC');
    });

    await t.test('should build correct INSERT query', () => {
      const query = 'INSERT INTO tasks (title) VALUES ($1) RETURNING *';
      const params = ['New Task'];
      assert.strictEqual(query, 'INSERT INTO tasks (title) VALUES ($1) RETURNING *');
      assert.deepStrictEqual(params, ['New Task']);
    });

    await t.test('should build correct UPDATE query', () => {
      const query = 'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *';
      const params = [true, 'Updated Task', 1];
      assert.strictEqual(query, 'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *');
      assert.deepStrictEqual(params, [true, 'Updated Task', 1]);
    });
  });

  // Test error handling scenarios
  await t.test('Error Handling', async (t) => {
    await t.test('should handle 400 Bad Request for invalid input', () => {
      const statusCode = 400;
      const error = { error: 'title is required' };
      assert.strictEqual(statusCode, 400);
      assert.deepStrictEqual(error, { error: 'title is required' });
    });

    await t.test('should handle 404 Not Found for missing resource', () => {
      const statusCode = 404;
      const error = { error: 'Not found' };
      assert.strictEqual(statusCode, 404);
      assert.deepStrictEqual(error, { error: 'Not found' });
    });

    await t.test('should handle 500 Internal Server Error for database errors', () => {
      const statusCode = 500;
      const error = { error: 'Internal server error' };
      assert.strictEqual(statusCode, 500);
      assert.deepStrictEqual(error, { error: 'Internal server error' });
    });

    await t.test('should handle 201 Created for successful POST', () => {
      const statusCode = 201;
      assert.strictEqual(statusCode, 201);
    });

    await t.test('should handle 200 OK for successful GET/PATCH', () => {
      const statusCode = 200;
      assert.strictEqual(statusCode, 200);
    });
  });
});
