const BASE = '/api/family';

function getToken() {
  return localStorage.getItem('family_token') || '';
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function setToken(token: string) {
  localStorage.setItem('family_token', token);
}
export function clearToken() {
  localStorage.removeItem('family_token');
}
export function hasToken() {
  return !!localStorage.getItem('family_token');
}

export const auth = {
  login: (username: string, password: string) =>
    req<{ token: string; user: FamilyUser }>('POST', '/auth/login', { username, password }),
  logout: () => req<{ ok: boolean }>('POST', '/auth/logout'),
  me: () => req<{ user: FamilyUser }>('GET', '/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    req<{ ok: boolean }>('PATCH', '/auth/password', { current_password, new_password }),
};

export const users = {
  list: () => req<{ users: FamilyUser[] }>('GET', '/users'),
  updateMe: (data: Partial<Pick<FamilyUser, 'display_name' | 'phone' | 'avatar_color'>>) =>
    req<{ user: FamilyUser }>('PATCH', '/users/me', data),
};

export const categories = {
  list: () => req<{ categories: Category[] }>('GET', '/categories'),
  create: (data: { name: string; color: string; icon: string }) =>
    req<{ category: Category }>('POST', '/categories', data),
  update: (id: number, data: Partial<{ name: string; color: string; icon: string }>) =>
    req<{ category: Category }>('PUT', `/categories/${id}`, data),
  delete: (id: number) => req<{ ok: boolean }>('DELETE', `/categories/${id}`),
};

export const todos = {
  list: (params?: { category_id?: number; priority?: string; completed?: boolean; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category_id != null) qs.set('category_id', String(params.category_id));
    if (params?.priority) qs.set('priority', params.priority);
    if (params?.completed != null) qs.set('completed', String(params.completed));
    if (params?.sort) qs.set('sort', params.sort);
    const query = qs.toString();
    return req<{ todos: Todo[] }>('GET', `/todos${query ? '?' + query : ''}`);
  },
  create: (data: Partial<Todo> & { title: string }) => req<{ todo: Todo }>('POST', '/todos', data),
  update: (id: number, data: Partial<Todo>) => req<{ todo: Todo }>('PUT', `/todos/${id}`, data),
  complete: (id: number) => req<{ todo: Todo }>('PATCH', `/todos/${id}/complete`),
  delete: (id: number) => req<{ ok: boolean }>('DELETE', `/todos/${id}`),
};

export interface FamilyUser {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  phone?: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_by?: number;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  completed: boolean;
  completed_by_name?: string;
  completed_at?: string;
  created_by?: number;
  created_by_name?: string;
  created_by_color?: string;
  created_at?: string;
}
