import api from './client';

export const analyticsApi = {
  // Backend GenerateReportRequest: { title, scope (always "ALL"), reportType, fromDate, toDate }
  generateReport: (data) => api.post('/reports/generate', data),

  getAll: (type) => api.get('/reports', { params: type ? { type } : undefined }),
  getById: (id) => api.get(`/reports/${id}`),
  getMy: () => api.get('/reports/my'),

  // serviceId, from, to are ALL required by backend (@RequestParam, no required=false)
  getSlaCompliance: (serviceId, from, to) =>
    api.get('/reports/sla-compliance', { params: { serviceId, from, to } }),

  // from, to are required
  getIncidentSummary: (from, to) =>
    api.get('/reports/incident-summary', { params: { from, to } }),

  delete: (id) => api.delete(`/reports/${id}`),
  getSnapshots: () => api.get('/reports/snapshots'),
  getSnapshotByType: (type) =>
    api.get(`/reports/snapshots/${type}`),
  generateOperations: () => api.post('/reports/snapshots/operations'),
  deleteSnapshot: (id) => api.delete(`/reports/snapshots/${id}`),
};
