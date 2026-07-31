import apiClient from './client';

export const billPdfPath = (id) => `/bills/${id}/pdf`;

/**
 * Fetches a PDF as a raw ArrayBuffer (auth header attached) plus a derived blob object URL.
 * The ArrayBuffer is handed to pdfjs-dist for in-page canvas rendering — deliberately not an
 * iframe pointed at a PDF resource, since some browser download-manager extensions intercept
 * PDF navigations (including blob: URLs) and hijack them into a download prompt instead of letting
 * them render inline. The blob URL is kept only for the explicit Print/Download actions, where a
 * "download" happening is expected behavior rather than a broken preview.
 */
async function fetchPdf(path) {
  const response = await apiClient.get(path, { responseType: 'arraybuffer' });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  return { arrayBuffer: response.data, blobUrl };
}

export const fetchBillPdf = (id) => fetchPdf(billPdfPath(id));
export const fetchQuotationPdf = (id) => fetchPdf(`/quotations/${id}/pdf`);
// Body-only variant for printing onto pre-printed letterhead paper — skips the artwork.
export const fetchQuotationPrintPdf = (id) => fetchPdf(`/quotations/${id}/pdf?bodyOnly=1`);

export const listBills = (params) => apiClient.get('/bills', { params });
export const getBill = (id) => apiClient.get(`/bills/${id}`);
export const createStandaloneBill = (data) => apiClient.post('/bills', data);
export const updateBill = (id, data) => apiClient.put(`/bills/${id}`, data);
export const deleteBill = (id) => apiClient.delete(`/bills/${id}`);
