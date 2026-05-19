import api from './client';


export const servicesApi = {
  getAll: (params) =>
    api.get('/services', { params }),
  getMy: () => api.get('/services/my'),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) =>
    api.put(`/services/${id}`, data),
  activate: (id) => api.put(`/services/${id}/activate`),
  deactivate: (id) => api.put(`/services/${id}/deactivate`),
  decommission: (id) => api.put(`/services/${id}/decommission`),
  assign: (id, userId, userName) =>
    api.put(`/services/${id}/assign`, { userId, userName }),
};

export const configurationsApi = {
  getByService: (serviceId) =>
    api.get(`/configurations/${serviceId}`),
  getById: (configId) =>
    api.get(`/configurations/detail/${configId}`),
  // Backend CreateConfigurationRequest: { parameter, value, effectiveDate }
  create: (serviceId, data) =>
    api.post(`/configurations/${serviceId}`, data),
  delete: (configId) => api.delete(`/configurations/${configId}`),
};
