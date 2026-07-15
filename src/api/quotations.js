import apiClient from './client';

export const listQuotations = (params) => apiClient.get('/quotations', { params });
export const getQuotationStats = () => apiClient.get('/quotations/stats');
export const getQuotation = (id) => apiClient.get(`/quotations/${id}`);
export const createQuotation = (data) => apiClient.post('/quotations', data);
export const updateQuotation = (id, data) => apiClient.put(`/quotations/${id}`, data);
export const reviseQuotation = (id, data) => apiClient.post(`/quotations/${id}/revise`, data);
export const updateQuotationStatus = (id, status, notes) => apiClient.patch(`/quotations/${id}/status`, { status, notes });
export const confirmQuotation = (id, data) => apiClient.post(`/quotations/${id}/confirm`, data);
export const deleteQuotation = (id) => apiClient.delete(`/quotations/${id}`);
export const exportQuotations = (format = 'excel', filters = {}) =>
  apiClient.get('/quotations/export', { params: { format, ...filters }, responseType: 'blob' });
export const quotationPdfUrl = (id, token) =>
  `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/quotations/${id}/pdf`;
