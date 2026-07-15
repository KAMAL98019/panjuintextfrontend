import apiClient from './client';

export const getSettings = () => apiClient.get('/settings');
export const updateSettings = (formData) =>
  apiClient.put('/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
