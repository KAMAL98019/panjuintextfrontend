import apiClient from './client';

export const listCustomers = (params) => apiClient.get('/customers', { params });
export const getCustomer = (id) => apiClient.get(`/customers/${id}`);
export const createCustomer = (data) => apiClient.post('/customers', data);
export const updateCustomer = (id, data) => apiClient.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => apiClient.delete(`/customers/${id}`);
