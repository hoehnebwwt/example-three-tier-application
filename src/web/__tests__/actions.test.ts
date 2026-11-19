import { getTasks, createTask, toggleTask, Task } from '../app/actions'

// Mock fetch globally
global.fetch = jest.fn()

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockTasks: Task[] = [
  { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
  { id: 2, title: 'Task 2', completed: true, created_at: '2024-01-02' },
]

describe('Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.API_URL = 'http://localhost:3001'
  })

  describe('getTasks', () => {
    it('should fetch tasks from API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTasks,
      })

      const tasks = await getTasks()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks', {
        cache: 'no-store',
      })
      expect(tasks).toEqual(mockTasks)
    })

    it('should use default API_URL when not set', async () => {
      delete process.env.API_URL
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTasks,
      })

      const tasks = await getTasks()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks', {
        cache: 'no-store',
      })
      expect(tasks).toEqual(mockTasks)
    })

    it('should throw error when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      await expect(getTasks()).rejects.toThrow('Failed to fetch tasks')
    })

    it('should return empty array when no tasks', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      })

      const tasks = await getTasks()

      expect(tasks).toEqual([])
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(getTasks()).rejects.toThrow()
    })
  })

  describe('createTask', () => {
    it('should create a task with valid title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 3, title: 'New Task', completed: false }),
      })

      const formData = new FormData()
      formData.append('title', 'New Task')

      await createTask(formData)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task' }),
      })
    })

    it('should trim whitespace from title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      })

      const formData = new FormData()
      formData.append('title', '  Trimmed Task  ')

      await createTask(formData)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '  Trimmed Task  ' }),
      })
    })

    it('should use custom API_URL', async () => {
      process.env.API_URL = 'http://api.example.com'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      })

      const formData = new FormData()
      formData.append('title', 'Task')

      await createTask(formData)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/tasks', expect.any(Object))
    })

    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const formData = new FormData()
      formData.append('title', 'Task')

      await expect(createTask(formData)).rejects.toThrow()
    })
  })

  describe('toggleTask', () => {
    it('should toggle task completion to true', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, title: 'Task 1', completed: true }),
      })

      await toggleTask(1, true)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
    })

    it('should toggle task completion to false', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, title: 'Task 1', completed: false }),
      })

      await toggleTask(1, false)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: false }),
      })
    })

    it('should use custom API_URL', async () => {
      process.env.API_URL = 'http://api.example.com'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      })

      await toggleTask(1, true)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/tasks/1', expect.any(Object))
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(toggleTask(1, true)).rejects.toThrow()
    })

    it('should work with different task IDs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      })

      await toggleTask(42, true)

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/tasks/42', expect.any(Object))
    })
  })
})
