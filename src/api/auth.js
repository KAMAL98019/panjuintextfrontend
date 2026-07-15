import apiClient from './client';

export const login = (email, password) => apiClient.post('/auth/login', { email, password });
export const me = () => apiClient.get('/auth/me');
export const resetPassword = (currentPassword, newPassword) =>
  apiClient.post('/auth/reset-password', { currentPassword, newPassword });
