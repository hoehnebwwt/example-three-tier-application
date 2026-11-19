'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
};

export type FilterOptions = {
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
};

export async function getTasks(filters?: FilterOptions): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  if (filters?.completed !== undefined) {
    params.append('completed', String(filters.completed));
  }
  
  const url = params.toString() ? `${API_URL}/tasks?${params.toString()}` : `${API_URL}/tasks`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
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
