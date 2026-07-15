import apiClient from './client';

export const globalSearch = (q) => apiClient.get('/search', { params: { q } });
