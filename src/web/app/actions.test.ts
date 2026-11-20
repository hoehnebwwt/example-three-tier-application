/**
 * @jest-environment node
 */

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const { getTasks, createTask, toggleTask, updateTaskPriority } = require('./actions');
const { revalidatePath } = require('next/cache');

describe('Task Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_URL = 'http://localhost:3001';
  });

  describe('getTasks', () => {
    test('should fetch all tasks without filters', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', completed: false, priority: 'medium', created_at: '2024-01-01' },
        { id: 2, title: 'Task 2', completed: true, priority: 'high', created_at: '2024-01-02' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await getTasks();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks', { cache: 'no-store' });
      expect(result).toEqual(mockTasks);
    });

    test('should fetch tasks with priority filter', async () => {
      const mockTasks = [
        { id: 1, title: 'High Priority Task', completed: false, priority: 'high', created_at: '2024-01-01' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await getTasks({ priority: 'high' });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks?priority=high', { cache: 'no-store' });
      expect(result).toEqual(mockTasks);
    });

    test('should fetch tasks with completed filter', async () => {
      const mockTasks = [
        { id: 2, title: 'Task 2', completed: true, priority: 'high', created_at: '2024-01-02' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await getTasks({ completed: true });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks?completed=true', { cache: 'no-store' });
      expect(result).toEqual(mockTasks);
    });

    test('should throw error when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(getTasks()).rejects.toThrow('Failed to fetch tasks');
    });
  });

  describe('createTask', () => {
    test('should create a task with title', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, title: 'New Task', priority: 'medium', completed: false }),
      });

      const formData = new FormData();
      formData.append('title', 'New Task');

      await createTask(formData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Task' }),
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('toggleTask', () => {
    test('should toggle task completion status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, title: 'Task', completed: true, priority: 'medium' }),
      });

      await toggleTask(1, true);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('updateTaskPriority', () => {
    test('should update task priority', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, title: 'Task', completed: false, priority: 'high' }),
      });

      await updateTaskPriority(1, 'high');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: 'high' }),
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });
});
