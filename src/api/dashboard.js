import apiClient from './client';

export const getDashboardStats = () => apiClient.get('/dashboard/stats');
export const getDashboardAnalytics = () => apiClient.get('/dashboard/analytics');
