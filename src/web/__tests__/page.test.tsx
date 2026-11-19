import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../app/page'
import * as actions from '../app/actions'

// Mock the server actions
jest.mock('../app/actions')

const mockTasks = [
  { id: 1, title: 'Task 1', completed: false, created_at: '2024-01-01' },
  { id: 2, title: 'Task 2', completed: true, created_at: '2024-01-02' },
]

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(actions.getTasks as jest.Mock).mockResolvedValue(mockTasks)
  })

  it('should render the page title', async () => {
    render(await Home())
    expect(screen.getByText('To-Do List')).toBeInTheDocument()
  })

  it('should render task list with all tasks', async () => {
    render(await Home())
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('should display task completion status', async () => {
    render(await Home())
    const tasks = screen.getAllByRole('button', { name: /mark/i })
    expect(tasks).toHaveLength(2)
  })

  it('should show completed task with strikethrough', async () => {
    render(await Home())
    const completedTask = screen.getByText('Task 2')
    expect(completedTask).toHaveClass('line-through')
  })

  it('should show incomplete task without strikethrough', async () => {
    render(await Home())
    const incompleteTask = screen.getByText('Task 1')
    expect(incompleteTask).not.toHaveClass('line-through')
  })

  it('should render add task form', async () => {
    render(await Home())
    const input = screen.getByPlaceholderText('Add a new task...')
    expect(input).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('should display task completion counter', async () => {
    render(await Home())
    expect(screen.getByText('1 / 2 completed')).toBeInTheDocument()
  })

  it('should show empty state message when no tasks', async () => {
    ;(actions.getTasks as jest.Mock).mockResolvedValue([])
    render(await Home())
    expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument()
  })

  it('should not show completion counter when no tasks', async () => {
    ;(actions.getTasks as jest.Mock).mockResolvedValue([])
    render(await Home())
    expect(screen.queryByText(/completed/)).not.toBeInTheDocument()
  })

  it('should call getTasks on render', async () => {
    render(await Home())
    expect(actions.getTasks).toHaveBeenCalled()
  })

  it('should render form with correct action', async () => {
    render(await Home())
    const form = screen.getByPlaceholderText('Add a new task...').closest('form')
    expect(form).toHaveAttribute('action')
  })

  it('should render toggle buttons for each task', async () => {
    render(await Home())
    const toggleButtons = screen.getAllByRole('button', { name: /mark/i })
    expect(toggleButtons).toHaveLength(mockTasks.length)
  })
})
