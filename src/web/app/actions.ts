'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  due_date?: string | null;
};

export type FilterOptions = {
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  due_date_filter?: 'overdue' | 'today' | 'this_week';
};

export async function getTasks(filters?: FilterOptions): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  if (filters?.completed !== undefined) {
    params.append('completed', String(filters.completed));
  }
  if (filters?.due_date_filter) {
    params.append('due_date_filter', filters.due_date_filter);
  }
  
  const url = params.toString() ? `${API_URL}/tasks?${params.toString()}` : `${API_URL}/tasks`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const due_date = formData.get('due_date') as string | null;
  const body: any = { title };
  if (due_date) {
    body.due_date = due_date;
  }
  await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  revalidatePath('/');
}

export async function toggleTask(id: number, completed: boolean) {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  revalidatePath('/');
}

export async function updateTaskPriority(id: number, priority: 'low' | 'medium' | 'high') {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  });
  revalidatePath('/');
}

export async function updateTaskDueDate(id: number, due_date: string | null) {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ due_date }),
  });
  revalidatePath('/');
}

export async function deleteTask(id: number) {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
  revalidatePath('/');
}
