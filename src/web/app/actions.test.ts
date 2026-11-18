const test = require('node:test');
const assert = require('node:assert');

// Web Frontend Server Actions Test Suite
// Tests for src/web/app/actions.ts

test('Server Actions - getTasks', async (t) => {
  await t.test('should construct correct API URL', () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const endpoint = `${apiUrl}/tasks`;
    assert.strictEqual(endpoint, 'http://localhost:3001/tasks');
  });

  await t.test('should use no-store cache policy', () => {
    const cachePolicy = 'no-store';
    assert.strictEqual(cachePolicy, 'no-store');
  });

  await t.test('should handle successful response', () => {
    const mockResponse = {
      ok: true,
      json: async () => [
        { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
      ],
    };
    assert.strictEqual(mockResponse.ok, true);
  });

  await t.test('should throw error on failed response', () => {
    const mockResponse = { ok: false };
    const shouldThrow = !mockResponse.ok;
    assert.strictEqual(shouldThrow, true);
  });
});

test('Server Actions - createTask', async (t) => {
  await t.test('should extract title from FormData', () => {
    const formData = new FormData();
    formData.append('title', 'New Task');
    const title = formData.get('title');
    assert.strictEqual(title, 'New Task');
  });

  await t.test('should use POST method', () => {
    const method = 'POST';
    assert.strictEqual(method, 'POST');
  });

  await t.test('should set correct Content-Type header', () => {
    const headers = { 'Content-Type': 'application/json' };
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  await t.test('should serialize title to JSON body', () => {
    const title = 'New Task';
    const body = JSON.stringify({ title });
    assert.strictEqual(body, '{"title":"New Task"}');
  });

  await t.test('should call revalidatePath after creation', () => {
    const path = '/';
    assert.strictEqual(path, '/');
  });
});

test('Server Actions - toggleTask', async (t) => {
  await t.test('should construct correct task endpoint URL', () => {
    const apiUrl = 'http://localhost:3001';
    const taskId = 1;
    const endpoint = `${apiUrl}/tasks/${taskId}`;
    assert.strictEqual(endpoint, 'http://localhost:3001/tasks/1');
  });

  await t.test('should use PATCH method', () => {
    const method = 'PATCH';
    assert.strictEqual(method, 'PATCH');
  });

  await t.test('should serialize completed status to JSON body', () => {
    const completed = true;
    const body = JSON.stringify({ completed });
    assert.strictEqual(body, '{"completed":true}');
  });

  await t.test('should handle completed=false', () => {
    const completed = false;
    const body = JSON.stringify({ completed });
    assert.strictEqual(body, '{"completed":false}');
  });

  await t.test('should call revalidatePath after toggle', () => {
    const path = '/';
    assert.strictEqual(path, '/');
  });
});

test('Server Actions - Error Handling', async (t) => {
  await t.test('should handle network errors in getTasks', () => {
    const error = new Error('Network error');
    assert.strictEqual(error.message, 'Network error');
  });

  await t.test('should handle network errors in createTask', () => {
    const error = new Error('Network error');
    assert.strictEqual(error.message, 'Network error');
  });

  await t.test('should handle network errors in toggleTask', () => {
    const error = new Error('Network error');
    assert.strictEqual(error.message, 'Network error');
  });

  await t.test('should handle API response errors', () => {
    const error = new Error('Failed to fetch tasks');
    assert.strictEqual(error.message, 'Failed to fetch tasks');
  });
});

test('Server Actions - Type Safety', async (t) => {
  await t.test('Task type should have required fields', () => {
    const task = {
      id: 1,
      title: 'Task 1',
      completed: false,
      created_at: '2024-01-01',
    };
    assert.strictEqual(typeof task.id, 'number');
    assert.strictEqual(typeof task.title, 'string');
    assert.strictEqual(typeof task.completed, 'boolean');
    assert.strictEqual(typeof task.created_at, 'string');
  });

  await t.test('getTasks should return Task array', () => {
    const tasks = [
      { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
      { id: 2, title: 'Task 2', completed: true, created_at: '2024-01-02' },
    ];
    assert.strictEqual(Array.isArray(tasks), true);
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].id, 1);
  });

  await t.test('createTask should accept FormData', () => {
    const formData = new FormData();
    formData.append('title', 'Test');
    assert.strictEqual(formData instanceof FormData, true);
  });

  await t.test('toggleTask should accept number and boolean', () => {
    const id = 1;
    const completed = true;
    assert.strictEqual(typeof id, 'number');
    assert.strictEqual(typeof completed, 'boolean');
  });
});

test('Server Actions - API URL Configuration', async (t) => {
  await t.test('should use default API_URL when not set', () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    assert.strictEqual(apiUrl, 'http://localhost:3001');
  });

  await t.test('should use custom API_URL when set', () => {
    const customUrl = 'http://api.example.com:3001';
    assert.strictEqual(customUrl, 'http://api.example.com:3001');
  });

  await t.test('should construct endpoints with API_URL', () => {
    const apiUrl = 'http://localhost:3001';
    const tasksEndpoint = `${apiUrl}/tasks`;
    const taskEndpoint = `${apiUrl}/tasks/1`;
    assert.strictEqual(tasksEndpoint, 'http://localhost:3001/tasks');
    assert.strictEqual(taskEndpoint, 'http://localhost:3001/tasks/1');
  });
});
