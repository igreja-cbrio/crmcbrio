// ══════════════════════════════════════
// API Client — todas as chamadas ao backend
// Gerencia JWT, refresh automático, e erros
// ══════════════════════════════════════

const BASE = '/api';

// Token management
let accessToken = localStorage.getItem('cbrio-token') || null;
let refreshToken = localStorage.getItem('cbrio-refresh') || null;

const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem('cbrio-token', access);
  else localStorage.removeItem('cbrio-token');
  if (refresh) localStorage.setItem('cbrio-refresh', refresh);
  else localStorage.removeItem('cbrio-refresh');
};

const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('cbrio-token');
  localStorage.removeItem('cbrio-refresh');
  localStorage.removeItem('cbrio-auth');
};

// Fetch com JWT automático
const apiFetch = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Se token expirou, tentar refresh
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      headers['Authorization'] = `Bearer ${data.accessToken}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.reload();
      return null;
    }
  }

  return res;
};

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
export const auth = {
  async login(user, pass) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro no login');
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem('cbrio-auth', JSON.stringify({ role: data.user.role, name: data.user.name }));
    return data.user;
  },

  logout() {
    clearTokens();
  },

  getAuth() {
    try {
      const s = localStorage.getItem('cbrio-auth');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },

  isLoggedIn() {
    return !!accessToken;
  },

  async me() {
    const res = await apiFetch('/auth/me');
    if (!res?.ok) return null;
    return res.json();
  },
};

// ══════════════════════════════════════
// EVENTS
// ══════════════════════════════════════
export const events = {
  async list() {
    const res = await apiFetch('/events');
    if (!res?.ok) return [];
    return res.json();
  },

  async get(id) {
    const res = await apiFetch(`/events/${id}`);
    if (!res?.ok) return null;
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async updateStatus(id, status) {
    const res = await apiFetch(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/events/${id}`, { method: 'DELETE' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },
};

// ══════════════════════════════════════
// TASKS
// ══════════════════════════════════════
export const tasks = {
  async list(eventId) {
    const q = eventId ? `?eventId=${eventId}` : '';
    const res = await apiFetch(`/tasks${q}`);
    if (!res?.ok) return [];
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async updateStatus(id, status) {
    const res = await apiFetch(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async addComment(id, text) {
    const res = await apiFetch(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },
};

// ══════════════════════════════════════
// MEETINGS
// ══════════════════════════════════════
export const meetings = {
  async list(eventId) {
    const q = eventId ? `?eventId=${eventId}` : '';
    const res = await apiFetch(`/meetings${q}`);
    if (!res?.ok) return [];
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async togglePendency(id) {
    const res = await apiFetch(`/meetings/pendencies/${id}/toggle`, { method: 'PATCH' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/meetings/${id}`, { method: 'DELETE' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },
};

// ══════════════════════════════════════
// EXPANSION
// ══════════════════════════════════════
export const expansion = {
  async listMilestones() {
    const res = await apiFetch('/expansion/milestones');
    if (!res?.ok) return [];
    return res.json();
  },

  async createMilestone(data) {
    const res = await apiFetch('/expansion/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async updateMilestone(id, data) {
    const res = await apiFetch(`/expansion/milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async deleteMilestone(id) {
    const res = await apiFetch(`/expansion/milestones/${id}`, { method: 'DELETE' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async createTask(data) {
    const res = await apiFetch('/expansion/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async updateSubtaskPct(id, pct) {
    const res = await apiFetch(`/expansion/subtasks/${id}/pct`, {
      method: 'PATCH',
      body: JSON.stringify({ pct }),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async deleteTask(id) {
    const res = await apiFetch(`/expansion/tasks/${id}`, { method: 'DELETE' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },
};

// ══════════════════════════════════════
// AGENTS
// ══════════════════════════════════════
export const agents = {
  async transcribe(eventId, transcript) {
    const res = await apiFetch('/agents/transcribe', {
      method: 'POST',
      body: JSON.stringify({ eventId, transcript }),
    });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async monitor() {
    const res = await apiFetch('/agents/monitor', { method: 'POST' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async generateReport() {
    const res = await apiFetch('/agents/generate-report', { method: 'POST' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async getQueue() {
    const res = await apiFetch('/agents/queue');
    if (!res?.ok) return [];
    return res.json();
  },

  async approve(id) {
    const res = await apiFetch(`/agents/queue/${id}/approve`, { method: 'PATCH' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },

  async reject(id) {
    const res = await apiFetch(`/agents/queue/${id}/reject`, { method: 'PATCH' });
    if (!res?.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
  },
};
