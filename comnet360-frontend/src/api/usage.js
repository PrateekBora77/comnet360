import api from './client';

export const usageApi = {
  create: (data) => api.post('/usage', data),
  getByService: (serviceId) => api.get(`/usage/service/${serviceId}`),
  getByServiceAndMetric: (serviceId, metricType) =>
    api.get(`/usage/service/${serviceId}/metric/${metricType}`),
  getByRange: (serviceId, from, to) =>
    api.get(`/usage/service/${serviceId}/range`, { params: { from, to } }),
  getByUser: (userId) => api.get(`/usage/user/${userId}`),
  getById: (id) => api.get(`/usage/${id}`),
};

export const slaApi = {
  getAll: () => api.get('/sla'),
  getById: (id) => api.get(`/sla/${id}`),
  getByService: (serviceId) => api.get(`/sla/service/${serviceId}`),
  // Backend CreateSlaRequest: { serviceId, metric (String), threshold, unit, operator, description }
  create: (data) => api.post('/sla', data),
  // PATCH /sla/{id} — partial update: threshold, operator, unit, description
  patch: (id, data) => api.patch(`/sla/${id}`, data),
  updateStatus: (id, status) => api.put(`/sla/${id}/status`, { status }),
  delete: (id) => api.delete(`/sla/${id}`),
  getAllBreaches: () => api.get('/sla/breaches'),
  getUnresolved: () => api.get('/sla/breaches/unresolved'),
  getBreachesByService: (serviceId) =>
    api.get(`/sla/breaches/service/${serviceId}`),
  resolveBreach: (breachId, notes) =>
    api.put(`/sla/breaches/${breachId}/resolve`, { notes }),
};
