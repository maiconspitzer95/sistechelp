const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sistech_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição com o servidor');
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: { loginOrRe: string; senha: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),
  changePassword: (data: { senhaAtual: string; novaSenha: string }) =>
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Setores
  getSectors: (all = false) => apiRequest(`/sectors?all=${all}`),
  createSector: (data: any) => apiRequest('/sectors', { method: 'POST', body: JSON.stringify(data) }),
  updateSector: (id: string, data: any) =>
    apiRequest(`/sectors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Usuários
  getUsers: (params: string = '') => apiRequest(`/users${params}`),
  getTechnicians: () => apiRequest('/users/technicians'),
  getProfiles: () => apiRequest('/users/profiles'),
  createUser: (data: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Categorias & Chamados
  getCategories: () => apiRequest('/tickets/categories'),
  getCategoryBySlug: (slug: string) => apiRequest(`/tickets/categories/${slug}`),
  getTickets: (queryString = '') => apiRequest(`/tickets${queryString}`),
  getTicket: (id: string) => apiRequest(`/tickets/${id}`),
  createTicket: (data: any) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  assignTicket: (id: string, data: { tecnico_id?: string; motivo?: string }) =>
    apiRequest(`/tickets/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),
  updateTicketStatus: (id: string, data: { status: string; motivo?: string }) =>
    apiRequest(`/tickets/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),
  resolveTicket: (id: string, data: { solucao: string }) =>
    apiRequest(`/tickets/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  completeTicket: (id: string, data: { nota?: number; comentario?: string }) =>
    apiRequest(`/tickets/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Chat & Mensagens
  getMessages: (chamadoId: string) => apiRequest(`/chat/${chamadoId}`),
  sendMessage: (
    chamadoId: string,
    data: { conteudo: string; eh_nota_interna?: boolean; solicitar_info?: boolean }
  ) => apiRequest(`/chat/${chamadoId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Assistente Virtual Sistech
  askAssistant: (question: string) =>
    apiRequest('/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) }),

  // Notificações
  getNotifications: () => apiRequest('/notifications'),
  markNotificationAsRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),

  // Dashboard & Métricas
  getDashboardOverview: () => apiRequest('/dashboard/overview'),

  // Base de Conhecimento
  getKnowledgeArticles: (queryString = '') => apiRequest(`/knowledge${queryString}`),
  getKnowledgeArticle: (id: string) => apiRequest(`/knowledge/${id}`),
  voteKnowledgeArticle: (id: string, util: boolean) =>
    apiRequest(`/knowledge/${id}/vote`, { method: 'POST', body: JSON.stringify({ util }) }),

  // Auditoria
  getAuditLogs: (queryString = '') => apiRequest(`/audit${queryString}`),
};
