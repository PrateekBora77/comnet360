import api from './client';

export const incidentsApi = {
  getAll: (params) =>
    api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  getByService: (serviceId) => api.get(`/incidents/service/${serviceId}`),
  getAssigned: (userId) => api.get(`/incidents/assigned/${userId}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  // Backend reads body.get("assignedTo") — must send { assignedTo: userId }
  assign: (id, userId) => api.put(`/incidents/${id}/assign`, { assignedTo: userId }),
  resolve: (id) => api.put(`/incidents/${id}/resolve`),
  close: (id) => api.put(`/incidents/${id}/close`),
};

export const commentsApi = {
  getAll: (incidentId) =>
    api.get(`/incidents/${incidentId}/comments`),
  // Backend AddCommentRequest: { comment } — NOT { content }
  create: (incidentId, comment) =>
    api.post(`/incidents/${incidentId}/comments`, { comment }),
};

export const actionsApi = {
  getByIncident: (incidentId) =>
    api.get(`/actions/incident/${incidentId}`),
  getById: (actionId) => api.get(`/actions/${actionId}`),
  // Backend CreateActionRequest: { ownerId, actionDescription, dueDate? } — no title field
  create: (
    incidentId,
    data
  ) => api.post(`/actions/incident/${incidentId}`, data),
  updateStatus: (actionId, status) =>
    api.put(`/actions/${actionId}/status`, { status }),
};
