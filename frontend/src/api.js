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

  // Detect HTML response (backend not available — e.g., Vercel static deploy)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Backend não disponível. Os módulos funcionam apenas com o servidor rodando localmente.');
  }

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

export const users = {
  list: () => get('/auth/users'),
};

export const events = {
  list: (params) => get('/events' + (params ? '?' + new URLSearchParams(params) : '')),
  dashboard: () => get('/events/dashboard'),
  categories: () => get('/events/categories'),
  get: (id) => get(`/events/${id}`),
  create: (data) => post('/events', data),
  update: (id, data) => put(`/events/${id}`, data),
  updateStatus: (id, status) => patch(`/events/${id}/status`, { status }),
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

export const dashboard = {
  pmo: () => get('/dashboard/pmo'),
  workload: () => get('/dashboard/workload'),
};

export const risks = {
  list: (eventId) => get(`/events/${eventId}/risks`),
  create: (eventId, data) => post(`/events/${eventId}/risks`, data),
  update: (riskId, data) => patch(`/events/risks/${riskId}`, data),
  remove: (riskId) => del(`/events/risks/${riskId}`),
};

export const retrospective = {
  get: (eventId) => get(`/events/${eventId}/retrospective`),
  save: (eventId, data) => post(`/events/${eventId}/retrospective`, data),
};

export const history = {
  list: (eventId) => get(`/events/${eventId}/history`),
};

export const tasks = {
  all: (params) => {
    const q = new URLSearchParams();
    if (params?.source) q.set('source', params.source);
    if (params?.area) q.set('area', params.area);
    const qs = q.toString();
    return get('/tasks/all' + (qs ? '?' + qs : ''));
  },
  updateStatus: (source, taskId, status) => patch(`/tasks/${source}/${taskId}/status`, { status }),
};

export const occurrences = {
  get: (occId) => get(`/occurrences/${occId}`),
  list: (eventId) => get(`/occurrences/${eventId}`),
  create: (eventId, data) => post(`/occurrences/${eventId}`, data),
  update: (id, data) => patch(`/occurrences/${id}`, data),
  remove: (id) => del(`/occurrences/${id}`),
  createTask: (occId, data) => post(`/occurrences/${occId}/tasks`, data),
  updateTask: (taskId, data) => patch(`/occurrences/tasks/${taskId}`, data),
  updateTaskStatus: (taskId, status) => patch(`/occurrences/tasks/${taskId}/status`, { status }),
  removeTask: (taskId) => del(`/occurrences/tasks/${taskId}`),
  createMeeting: (occId, data) => post(`/occurrences/${occId}/meetings`, data),
  removeMeeting: (id) => del(`/occurrences/meetings/${id}`),
  togglePendency: (id, done) => patch(`/occurrences/pendencies/${id}`, { done }),
};

export const cycles = {
  activate: (eventId) => post(`/cycles/activate/${eventId}`, {}),
  get: (eventId) => get(`/cycles/${eventId}`),
  updatePhase: (phaseId, data) => patch(`/cycles/phases/${phaseId}`, data),
  createTask: (data) => post('/cycles/tasks', data),
  updateTask: (taskId, data) => patch(`/cycles/tasks/${taskId}`, data),
  updateAdmItem: (itemId, data) => patch(`/cycles/adm/${itemId}`, data),
  registerExpense: (data) => post('/cycles/expenses', data),
  summaryAll: () => get('/cycles/summary/all'),
};

export const agents = {
  generate: (data) => post('/agents/generate', data),
  queue: () => get('/agents/queue'),
  approve: (id) => patch(`/agents/queue/${id}/approve`),
  reject: (id) => patch(`/agents/queue/${id}/reject`),
  log: () => get('/agents/log'),
};

export const financeiro = {
  dashboard: () => get('/financeiro/dashboard'),
  contas: {
    list: () => get('/financeiro/contas'),
    create: (data) => post('/financeiro/contas', data),
    update: (id, data) => put(`/financeiro/contas/${id}`, data),
    remove: (id) => del(`/financeiro/contas/${id}`),
  },
  categorias: {
    list: () => get('/financeiro/categorias'),
    create: (data) => post('/financeiro/categorias', data),
    remove: (id) => del(`/financeiro/categorias/${id}`),
  },
  transacoes: {
    list: (params) => get('/financeiro/transacoes' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/financeiro/transacoes', data),
    update: (id, data) => put(`/financeiro/transacoes/${id}`, data),
    remove: (id) => del(`/financeiro/transacoes/${id}`),
  },
  contasPagar: {
    list: (params) => get('/financeiro/contas-pagar' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/financeiro/contas-pagar', data),
    update: (id, data) => put(`/financeiro/contas-pagar/${id}`, data),
    remove: (id) => del(`/financeiro/contas-pagar/${id}`),
  },
  reembolsos: {
    list: (params) => get('/financeiro/reembolsos' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/financeiro/reembolsos', data),
    aprovar: (id, status) => patch(`/financeiro/reembolsos/${id}`, { status }),
  },
};

export const logistica = {
  dashboard: () => get('/logistica/dashboard'),
  fornecedores: {
    list: (params) => get('/logistica/fornecedores' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/logistica/fornecedores', data),
    update: (id, data) => put(`/logistica/fornecedores/${id}`, data),
    remove: (id) => del(`/logistica/fornecedores/${id}`),
  },
  solicitacoes: {
    list: (params) => get('/logistica/solicitacoes' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/logistica/solicitacoes', data),
    atualizar: (id, data) => patch(`/logistica/solicitacoes/${id}`, data),
  },
  pedidos: {
    list: (params) => get('/logistica/pedidos' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/logistica/pedidos', data),
    update: (id, data) => put(`/logistica/pedidos/${id}`, data),
    remove: (id) => del(`/logistica/pedidos/${id}`),
    receber: (id, data) => post(`/logistica/pedidos/${id}/recebimento`, data),
  },
};

export const patrimonio = {
  dashboard: () => get('/patrimonio/dashboard'),
  categorias: {
    list: () => get('/patrimonio/categorias'),
    create: (data) => post('/patrimonio/categorias', data),
    remove: (id) => del(`/patrimonio/categorias/${id}`),
  },
  localizacoes: {
    list: () => get('/patrimonio/localizacoes'),
    create: (data) => post('/patrimonio/localizacoes', data),
    remove: (id) => del(`/patrimonio/localizacoes/${id}`),
  },
  bens: {
    list: (params) => get('/patrimonio/bens' + (params ? '?' + new URLSearchParams(params) : '')),
    get: (id) => get(`/patrimonio/bens/${id}`),
    create: (data) => post('/patrimonio/bens', data),
    update: (id, data) => put(`/patrimonio/bens/${id}`, data),
    remove: (id) => del(`/patrimonio/bens/${id}`),
    movimentar: (id, data) => post(`/patrimonio/bens/${id}/movimentacoes`, data),
  },
  inventarios: {
    list: () => get('/patrimonio/inventarios'),
    create: (data) => post('/patrimonio/inventarios', data),
    atualizar: (id, data) => patch(`/patrimonio/inventarios/${id}`, data),
  },
};

export const rh = {
  dashboard: () => get('/rh/dashboard'),
  funcionarios: {
    list: (params) => get('/rh/funcionarios' + (params ? '?' + new URLSearchParams(params) : '')),
    get: (id) => get(`/rh/funcionarios/${id}`),
    create: (data) => post('/rh/funcionarios', data),
    update: (id, data) => put(`/rh/funcionarios/${id}`, data),
    remove: (id) => del(`/rh/funcionarios/${id}`),
  },
  documentos: {
    create: (funcId, data) => post(`/rh/funcionarios/${funcId}/documentos`, data),
    remove: (id) => del(`/rh/documentos/${id}`),
  },
  treinamentos: {
    list: () => get('/rh/treinamentos'),
    create: (data) => post('/rh/treinamentos', data),
    update: (id, data) => put(`/rh/treinamentos/${id}`, data),
    remove: (id) => del(`/rh/treinamentos/${id}`),
    inscrever: (id, data) => post(`/rh/treinamentos/${id}/inscrever`, data),
    atualizarInscricao: (id, data) => patch(`/rh/treinamentos-funcionarios/${id}`, data),
  },
  materiais: {
    list: (params) => get('/rh/materiais' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/rh/materiais', data),
    remove: (id) => del(`/rh/materiais/${id}`),
    enviar: (id, data) => post(`/rh/materiais/${id}/enviar`, data),
    atualizarStatus: (id, data) => patch(`/rh/materiais-funcionarios/${id}`, data),
  },
  ferias: {
    create: (funcId, data) => post(`/rh/funcionarios/${funcId}/ferias`, data),
    update: (id, data) => patch(`/rh/ferias/${id}`, data),
    remove: (id) => del(`/rh/ferias/${id}`),
  },
  extras: {
    list: (params) => get('/rh/extras' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => post('/rh/extras', data),
    update: (id, data) => patch(`/rh/extras/${id}`, data),
    remove: (id) => del(`/rh/extras/${id}`),
  },
  config: {
    get: () => get('/rh/config'),
    set: (chave, valor) => put(`/rh/config/${chave}`, { valor }),
  },
};

export const notificacoes = {
  list: () => get('/notificacoes'),
  count: () => get('/notificacoes/count'),
  ler: (id) => patch(`/notificacoes/${id}/ler`),
  lerTodas: () => patch('/notificacoes/ler-todas'),
};

export const membresia = {
  kpis: () => get('/membresia/kpis'),
  membros: {
    list: (params) => get('/membresia/membros' + (params ? '?' + new URLSearchParams(params) : '')),
    get: (id) => get(`/membresia/membros/${id}`),
    create: (data) => post('/membresia/membros', data),
    update: (id, data) => put(`/membresia/membros/${id}`, data),
    remove: (id) => del(`/membresia/membros/${id}`),
  },
  trilha: {
    create: (data) => post('/membresia/trilha', data),
    update: (id, data) => patch(`/membresia/trilha/${id}`, data),
  },
  familias: {
    list: () => get('/membresia/familias'),
    create: (data) => post('/membresia/familias', data),
  },
  historico: {
    create: (data) => post('/membresia/historico', data),
  },
};
