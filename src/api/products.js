import apiClient from './client';

export const listProducts = (params) => apiClient.get('/products', { params });
export const getProduct = (id) => apiClient.get(`/products/${id}`);
export const createProduct = (data) => apiClient.post('/products', data);
export const updateProduct = (id, data) => apiClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);
export const productCategoryCounts = () => apiClient.get('/products/category-counts');
