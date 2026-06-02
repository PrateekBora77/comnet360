import api from './client';

export const notificationsApi = {
  send: (data) => api.post('/notifications', data),
  getByUser: (userId) => api.get(`/notifications/user/${userId}`),
  getUnread: (userId) =>
    api.get(`/notifications/user/${userId}/unread`),
  getUnreadCount: (userId) =>
    api.get(`/notifications/user/${userId}/count`),
  getById: (id) => api.get(`/notifications/${id}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: (userId) => api.put(`/notifications/user/${userId}/read-all`),
  getPreferences: (userId) =>
    api.get(`/notifications/preferences/${userId}`),
  updatePreferences: (userId, data) =>
    api.put(`/notifications/preferences/${userId}`, data),
};
