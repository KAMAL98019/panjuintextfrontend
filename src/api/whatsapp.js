import apiClient from './client';

export const getWhatsappStatus = (purpose) => apiClient.get(`/whatsapp/${purpose}/status`);
export const connectWhatsapp = (purpose) => apiClient.post(`/whatsapp/${purpose}/connect`);
export const logoutWhatsapp = (purpose) => apiClient.post(`/whatsapp/${purpose}/logout`);
export const refreshWhatsappQr = (purpose) => apiClient.post(`/whatsapp/${purpose}/refresh-qr`);

export const listTemplates = (purpose) => apiClient.get(`/whatsapp/${purpose}/templates`);
export const createTemplate = (purpose, data) => apiClient.post(`/whatsapp/${purpose}/templates`, data);
export const updateTemplate = (id, data) => apiClient.put(`/whatsapp/templates/${id}`, data);
export const deleteTemplate = (id) => apiClient.delete(`/whatsapp/templates/${id}`);

export const listWhatsappLogs = (purpose, since) => apiClient.get(`/whatsapp/${purpose}/logs`, { params: { since } });

export const sendDocumentViaWhatsapp = (data) => apiClient.post('/whatsapp/send-document', data);
export const broadcastGreeting = (data) => apiClient.post('/whatsapp/broadcast/greeting', data);
