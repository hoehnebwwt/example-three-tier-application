'use client';

import { useState, useEffect } from 'react';
import { getTasks, createTask, toggleTask, updateTaskPriority, deleteTask, type Task, type FilterOptions } from './actions';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const data = await getTasks(filters);
        setTasks(data);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [filters]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
      case 'low':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    }
  };

  const handleCreateTask = async (formData: FormData) => {
    await createTask(formData);
    // Reload tasks after creation
    const data = await getTasks(filters);
    setTasks(data);
  };

  const handleToggleTask = async (id: number, completed: boolean) => {
    await toggleTask(id, !completed);
    // Reload tasks after toggle
    const data = await getTasks(filters);
    setTasks(data);
  };

  const handleUpdatePriority = async (id: number, priority: 'low' | 'medium' | 'high') => {
    await updateTaskPriority(id, priority);
    // Reload tasks after update
    const data = await getTasks(filters);
    setTasks(data);
  };

  const handleDeleteTask = async (id: number) => {
    await deleteTask(id);
    // Reload tasks after deletion
    const data = await getTasks(filters);
    setTasks(data);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-16 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          To-Do List
        </h1>

        {/* Add task form */}
        <form action={handleCreateTask} className="flex gap-2 mb-8">
          <input
            name="title"
            type="text"
            required
            placeholder="Add a new task..."
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2 font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Add
          </button>
        </form>

        {/* Filter controls */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <select
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange({ ...filters, priority: e.target.value as any || undefined })}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <select
            value={filters.completed === undefined ? '' : String(filters.completed)}
            onChange={(e) => {
              if (e.target.value === '') {
                handleFilterChange({ ...filters, completed: undefined });
              } else {
                handleFilterChange({ ...filters, completed: e.target.value === 'true' });
              }
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="">All Tasks</option>
            <option value="false">Active Only</option>
            <option value="true">Completed Only</option>
          </select>

          {(filters.priority || filters.completed !== undefined) && (
            <button
              onClick={() => handleFilterChange({})}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Task list */}
        <ul className="space-y-2">
          {loading && (
            <li className="text-zinc-400 text-center py-8">Loading...</li>
          )}
          {!loading && tasks.length === 0 && (
            <li className="text-zinc-400 text-center py-8">
              {Object.keys(filters).length > 0 ? 'No tasks match your filters.' : 'No tasks yet. Add one above!'}
            </li>
          )}
          {!loading && tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3"
            >
              <button
                onClick={() => handleToggleTask(task.id, task.completed)}
                className={`h-5 w-5 rounded border-2 flex-shrink-0 transition-colors ${
                  task.completed
                    ? 'bg-zinc-900 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-50'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500'
                }`}
                aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.completed && (
                  <svg viewBox="0 0 12 12" className="text-white dark:text-zinc-900 w-full h-full p-0.5">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.completed
                    ? 'line-through text-zinc-400'
                    : 'text-zinc-800 dark:text-zinc-100'
                }`}
              >
                {task.title}
              </span>
              <select
                value={task.priority}
                onChange={(e) => handleUpdatePriority(task.id, e.target.value as 'low' | 'medium' | 'high')}
                className={`text-xs px-2 py-1 rounded font-medium cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-zinc-500 ${getPriorityColor(task.priority)}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="flex-shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label="Delete task"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 1a.5.5 0 0 0-.5.5v1h13V1.5a.5.5 0 0 0-.5-.5h-3V1a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v.5h-3z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {!loading && tasks.length > 0 && (
          <p className="mt-4 text-xs text-zinc-400 text-right">
            {tasks.filter((t) => t.completed).length} / {tasks.length} completed
          </p>
        )}
      </div>
    </div>
  );
}
