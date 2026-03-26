const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    return;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),

  // People Moves
  getPeopleMoves: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/people-moves${qs ? '?' + qs : ''}`);
  },
  getPeopleMove: (id) => request(`/api/people-moves/${id}`),
  createPeopleMove: (data) =>
    request('/api/people-moves', { method: 'POST', body: JSON.stringify(data) }),
  updatePeopleMove: (id, data) =>
    request(`/api/people-moves/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePeopleMove: (id) => request(`/api/people-moves/${id}`, { method: 'DELETE' }),

  // Insights
  getInsights: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/insights${qs ? '?' + qs : ''}`);
  },
  getInsight: (id) => request(`/api/insights/${id}`),
  createInsight: (data) =>
    request('/api/insights', { method: 'POST', body: JSON.stringify(data) }),
  updateInsight: (id, data) =>
    request(`/api/insights/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInsight: (id) => request(`/api/insights/${id}`, { method: 'DELETE' }),

  // Subscribers
  getSubscribers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/subscribers${qs ? '?' + qs : ''}`);
  },
  getSubscriber: (id) => request(`/api/subscribers/${id}`),
  createSubscriber: (data) =>
    request('/api/subscribers', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscriber: (id, data) =>
    request(`/api/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSubscriber: (id) => request(`/api/subscribers/${id}`, { method: 'DELETE' }),
  getStats: () => request('/api/subscribers/stats'),
};
