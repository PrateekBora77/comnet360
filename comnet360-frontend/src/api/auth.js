import api from './client';

export const authApi = {
  login:          (data)         => api.post('/auth/login', data),
  register:       (data)         => api.post('/auth/register', data),
  refresh:        (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout:         ()             => api.post('/auth/logout'),
  forgotPassword: (email)        => api.post('/auth/forgot-password', { email }),
  resetPassword:  (email, otp, newPassword) =>
                    api.post('/auth/reset-password', { email, otp, newPassword }),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getAdmins: () => api.get('/users/admins'),   // any authenticated user
  getById: (id) => api.get(`/users/${id}`),
  getMe: () => api.get('/users/me'),
  // POST /users — admin creates a user with a specified role (no JWT returned)
  createUser: (data) => api.post('/users', data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  updateStatus: (id, isActive) => api.put(`/users/${id}/status`, { isActive }),
  // PATCH /users/{id}/profile — update name and/or phone
  updateProfile: (id, data) =>
    api.patch(`/users/${id}/profile`, data),
  // DELETE /users/{id} — admin only
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const auditApi = {
  getAll: () => api.get('/audit-logs'),
  getByUser: (userId) => api.get(`/audit-logs/user/${userId}`),
  getByRange: (from, to) =>
    api.get('/audit-logs/range', { params: { from, to } }),
};
