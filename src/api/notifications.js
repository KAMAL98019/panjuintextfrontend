import apiClient from './client';

export const listNotifications = (params) => apiClient.get('/notifications', { params });
export const markNotificationRead = (id) => apiClient.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiClient.patch('/notifications/read-all');
