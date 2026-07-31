import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { X, Printer, Download, ZoomIn, ZoomOut, MessageCircle } from 'lucide-react';
import Button from './Button';
import Spinner from './Spinner';
import { fetchQuotationPdf, fetchQuotationPrintPdf, fetchBillPdf } from '../api/bills';
import { sendDocumentViaWhatsapp } from '../api/whatsapp';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
/**
 * In-page document viewer for a quotation's Quotation / Memo / GST Bill PDFs — tabs + zoom + print
 * + download. Renders the real PDFKit-generated PDF onto a <canvas> via pdfjs-dist rather than
 * pointing an iframe at the PDF resource: some browser download-manager extensions intercept PDF
 * navigations (even blob: URLs) and hijack the preview into a forced download dialog. Canvas
 * rendering never triggers that navigation at all, so the preview always works regardless of the
 * viewer's browser/extension configuration. Print/Download still use a real blob URL since a
 * "download" happening there is the intended action, not a broken preview.
 */
export default function DocumentPreviewModal({ quotation, initialTab = 'quotation', onClose, onRequestCustomize }) {
  const order = quotation.order;
  const memoBill = order?.bills?.find((b) => b.billType === 'Memo');
  const gstBill = order?.bills?.find((b) => b.billType === 'GST');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [docs, setDocs] = useState({}); // { [tab]: { arrayBuffer, blobUrl } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const pagesContainerRef = useRef(null);
  const renderGenRef = useRef(0);
  const [waMenuOpen, setWaMenuOpen] = useState(false);
  const [waSendToOwner, setWaSendToOwner] = useState(true);
  const [waSendToCustomer, setWaSendToCustomer] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);

  const tabs = [
    { key: 'quotation', label: 'Quotation', available: true },
    { key: 'memo', label: 'Memo', available: !!memoBill },
    { key: 'gst', label: 'GST Bill', available: !!gstBill && quotation.quotationType === 'GST' },
  ].filter((t) => t.available);

  const loadTab = useCallback(async (tab) => {
    setLoading(true);
    setError(false);
    try {
      let doc = null;
      if (tab === 'quotation') doc = await fetchQuotationPdf(quotation.id);
      else if (tab === 'memo' && memoBill) doc = await fetchBillPdf(memoBill.id);
      else if (tab === 'gst' && gstBill) doc = await fetchBillPdf(gstBill.id);
      if (doc) setDocs((d) => ({ ...d, [tab]: doc }));
    } catch (err) {
      setError(true);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation.id, memoBill?.id, gstBill?.id]);

  useEffect(() => {
    if (!docs[activeTab]) loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Render every page of the active document stacked vertically (multi-page quotations flow onto
  // page 2+), re-rendering whenever the document or zoom changes. A generation counter abandons
  // stale renders when the user switches tabs or zooms mid-render.
  useEffect(() => {
    const doc = docs[activeTab];
    const container = pagesContainerRef.current;
    if (!doc || !container) return;

    const gen = ++renderGenRef.current;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: doc.arrayBuffer.slice(0) }).promise;
        if (gen !== renderGenRef.current) return;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: (zoom / 100) * 1.5 });
          if (gen !== renderGenRef.current) return;

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'bg-white shadow-lg';
          container.appendChild(canvas);

          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (gen !== renderGenRef.current) return;
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && gen === renderGenRef.current) {
          setError(true);
        }
      }
    })();
  }, [docs, activeTab, zoom]);

  const handleRequestCustomize = (billType) => {
    if (!order) {
      toast.error('Confirm the order before generating this document');
      return;
    }
    onRequestCustomize(billType);
  };

  // Quotation printing uses a body-only PDF (no letterhead artwork) for printing onto
  // pre-printed letterhead paper stock — fetched fresh, not the cached on-screen preview blob.
  // Memo/GST Bill printing is unaffected.
  const handlePrint = async () => {
    if (activeTab === 'quotation') {
      try {
        const printDoc = await fetchQuotationPrintPdf(quotation.id);
        const win = window.open(printDoc.blobUrl, '_blank');
        if (win) win.addEventListener('load', () => win.print());
      } catch (err) {
        toast.error('Failed to prepare print document');
      }
      return;
    }
    const doc = docs[activeTab];
    if (!doc) return;
    const win = window.open(doc.blobUrl, '_blank');
    if (win) {
      win.addEventListener('load', () => win.print());
    }
  };

  const handleDownload = () => {
    const doc = docs[activeTab];
    if (!doc) return;
    const a = document.createElement('a');
    a.href = doc.blobUrl;
    a.download = `${quotation.quotationNumber}-${activeTab}.pdf`;
    a.click();
  };

  const handleSendWhatsapp = async () => {
    if (!waSendToOwner && !waSendToCustomer) {
      toast.error('Select at least one recipient');
      return;
    }
    const documentType = activeTab === 'quotation' ? 'Quotation' : activeTab === 'memo' ? 'Memo' : 'GST';
    const billId = activeTab === 'memo' ? memoBill?.id : activeTab === 'gst' ? gstBill?.id : undefined;
    setWaSending(true);
    try {
      const res = await sendDocumentViaWhatsapp({
        quotationId: quotation.id,
        documentType,
        billId,
        sendToOwner: waSendToOwner,
        sendToCustomer: waSendToCustomer,
        message: waMessage || undefined,
      });
      const failed = res.data.data.filter((r) => r.status === 'Failed');
      if (failed.length > 0) toast.error(`Failed for: ${failed.map((f) => f.label).join(', ')} — ${failed[0].error || ''}`);
      else toast.success('Sent via WhatsApp');
      setWaMenuOpen(false);
      setWaMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send via WhatsApp');
    } finally {
      setWaSending(false);
    }
  };

  const handleDownloadAll = () => {
    tabs.forEach((t, idx) => {
      const doc = docs[t.key];
      if (!doc) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = doc.blobUrl;
        a.download = `${quotation.quotationNumber}-${t.key}.pdf`;
        a.click();
      }, idx * 300);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex gap-2">
            {order && !memoBill && (
              <Button variant="accent" onClick={() => handleRequestCustomize('Memo')}>Create MEMO</Button>
            )}
            {order && !gstBill && quotation.quotationType === 'GST' && (
              <Button variant="accent" onClick={() => handleRequestCustomize('GST')}>Create GST Bill</Button>
            )}
            {tabs.length > 0 && Object.keys(docs).length > 0 && (
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download size={14} /> Download All
              </Button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setZoom((z) => Math.max(60, z - 10))} className="text-gray-400 hover:text-gray-600" title="Zoom out">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(160, z + 10))} className="text-gray-400 hover:text-gray-600" title="Zoom in">
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={handlePrint} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Print" disabled={!docs[activeTab]}>
              <Printer size={16} />
            </button>
            <button onClick={handleDownload} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Download" disabled={!docs[activeTab]}>
              <Download size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => setWaMenuOpen((o) => !o)}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="Send via WhatsApp"
                disabled={!docs[activeTab]}
              >
                <MessageCircle size={16} />
              </button>
              {waMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWaMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-40">
                    <p className="text-xs font-semibold text-navy-900 mb-2">Send via WhatsApp</p>
                    <label className="flex items-center gap-2 text-xs mb-1.5">
                      <input type="checkbox" checked={waSendToOwner} onChange={(e) => setWaSendToOwner(e.target.checked)} /> Send to owner
                    </label>
                    <label className="flex items-center gap-2 text-xs mb-2">
                      <input type="checkbox" checked={waSendToCustomer} onChange={(e) => setWaSendToCustomer(e.target.checked)} /> Send to customer
                    </label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs mb-2"
                      placeholder="Message with the PDF (optional)"
                      value={waMessage}
                      onChange={(e) => setWaMessage(e.target.value)}
                    />
                    <Button variant="accent" className="w-full justify-center" onClick={handleSendWhatsapp} disabled={waSending}>
                      {waSending ? 'Sending...' : 'Send PDF'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
          {loading && !docs[activeTab] ? (
            <Spinner size={34} label="Loading document..." className="self-start mt-16" />
          ) : error && !docs[activeTab] ? (
            <p className="text-sm text-red-400 self-start mt-10">Failed to load document.</p>
          ) : docs[activeTab] ? (
            <div ref={pagesContainerRef} className="flex flex-col items-center gap-4 h-fit" />
          ) : (
            <p className="text-sm text-gray-400 self-start mt-10">Not generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
