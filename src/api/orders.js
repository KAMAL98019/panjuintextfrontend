import apiClient from './client';

export const listOrders = (params) => apiClient.get('/orders', { params });
export const getOrder = (id) => apiClient.get(`/orders/${id}`);
export const updateOrder = (id, data) => apiClient.put(`/orders/${id}`, data);
export const updateOrderStatus = (id, status) => apiClient.patch(`/orders/${id}/status`, { status });
export const updateOrderTracking = (id, data) => apiClient.patch(`/orders/${id}/tracking`, data);

export const listPayments = (orderId) => apiClient.get(`/orders/${orderId}/payments`);
export const createPayment = (orderId, data) => apiClient.post(`/orders/${orderId}/payments`, data);

export const listBills = (orderId) => apiClient.get(`/orders/${orderId}/bills`);
export const createBill = (orderId, billType, customFields, items) =>
  apiClient.post(`/orders/${orderId}/bills`, { billType, customFields, items });
