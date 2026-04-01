import { supabase } from './supabaseClient';

const API = '/api';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

const headers = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request(path, opts = {}) {
  const h = await headers();
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...h, ...opts.headers } });
  if (res.status === 401) {
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = (path) => request(path, { method: 'DELETE' });

// Auth é gerenciado pelo Supabase Auth (AuthContext.jsx)
// Removidos: setToken, clearToken, getToken, auth.login, auth.me

export const events = {
  list: (params) => get('/events' + (params ? '?' + new URLSearchParams(params) : '')),
  dashboard: () => get('/events/dashboard'),
  categories: () => get('/events/categories'),
  get: (id) => get(`/events/${id}`),
  create: (data) => post('/events', data),
  update: (id, data) => put(`/events/${id}`, data),
  remove: (id) => del(`/events/${id}`),
  // Occurrences
  updateOccurrence: (evId, occId, data) => patch(`/events/${evId}/occurrences/${occId}`, data),
  // Tasks
  createTask: (evId, data) => post(`/events/${evId}/tasks`, data),
  updateTask: (taskId, data) => put(`/events/tasks/${taskId}`, data),
  updateTaskStatus: (taskId, status) => patch(`/events/tasks/${taskId}/status`, { status }),
  removeTask: (taskId) => del(`/events/tasks/${taskId}`),
  // Subtasks
  createSubtask: (taskId, data) => post(`/events/tasks/${taskId}/subtasks`, data),
  toggleSubtask: (subId, done) => patch(`/events/subtasks/${subId}`, { done }),
  removeSubtask: (subId) => del(`/events/subtasks/${subId}`),
  // Comments
  addComment: (taskId, text) => post(`/events/tasks/${taskId}/comments`, { text }),
};

export const projects = {
  list: (params) => get('/projects' + (params ? '?' + new URLSearchParams(params) : '')),
  dashboard: () => get('/projects/dashboard'),
  get: (id) => get(`/projects/${id}`),
  create: (data) => post('/projects', data),
  update: (id, data) => put(`/projects/${id}`, data),
  remove: (id) => del(`/projects/${id}`),
  // Objectives
  createObjective: (pId, data) => post(`/projects/${pId}/objectives`, data),
  updateObjective: (objId, data) => put(`/projects/objectives/${objId}`, data),
  // Tasks
  createTask: (pId, data) => post(`/projects/${pId}/tasks`, data),
  updateTask: (taskId, data) => put(`/projects/tasks/${taskId}`, data),
  updateTaskStatus: (taskId, status) => patch(`/projects/tasks/${taskId}/status`, { status }),
  removeTask: (taskId) => del(`/projects/tasks/${taskId}`),
  // Milestones
  createMilestone: (pId, data) => post(`/projects/${pId}/milestones`, data),
  toggleMilestone: (mId, done) => patch(`/projects/milestones/${mId}`, { done }),
  // Views
  workload: () => get('/projects/views/workload'),
  pendenciesByArea: () => get('/projects/views/pendencies-by-area'),
};

export const expansion = {
  dashboard: () => get('/expansion/dashboard'),
  milestones: () => get('/expansion/milestones'),
  createMilestone: (data) => post('/expansion/milestones', data),
  updateMilestone: (id, data) => put(`/expansion/milestones/${id}`, data),
  removeMilestone: (id) => del(`/expansion/milestones/${id}`),
  createTask: (miId, data) => post(`/expansion/milestones/${miId}/tasks`, data),
  updateTask: (id, data) => put(`/expansion/tasks/${id}`, data),
  removeTask: (id) => del(`/expansion/tasks/${id}`),
  createSubtask: (taskId, data) => post(`/expansion/tasks/${taskId}/subtasks`, data),
  updateSubtaskPct: (id, pct) => patch(`/expansion/subtasks/${id}`, { pct }),
  removeSubtask: (id) => del(`/expansion/subtasks/${id}`),
};

export const meetings = {
  list: (params) => get('/meetings' + (params ? '?' + new URLSearchParams(params) : '')),
  create: (data) => post('/meetings', data),
  update: (id, data) => put(`/meetings/${id}`, data),
  remove: (id) => del(`/meetings/${id}`),
  togglePendency: (id, done) => patch(`/meetings/pendencies/${id}`, { done }),
  removePendency: (id) => del(`/meetings/pendencies/${id}`),
};

export const agents = {
  generate: (data) => post('/agents/generate', data),
  queue: () => get('/agents/queue'),
  approve: (id) => patch(`/agents/queue/${id}/approve`),
  reject: (id) => patch(`/agents/queue/${id}/reject`),
  log: () => get('/agents/log'),
};
