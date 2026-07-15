import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Send } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Label, Input, Textarea } from './form/Field';
import { sendDocumentViaWhatsapp } from '../api/whatsapp';

// Numbers the admin saved for quick re-use (site engineers, partners, own second number...).
// Single-admin app — the browser's storage is the right home for this convenience list.
const SAVED_KEY = 'panjuintext_saved_wa_numbers';
const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
};

/**
 * One-click WhatsApp sharing from the quotation list: pick which document, tick
 * owner / customer / any saved number, optionally add + save a new number, send as PDF.
 */
export default function ShareDocumentModal({ quotation, bill, onClose }) {
  const order = bill?.order || quotation?.order;
  const memoBill = bill?.billType === 'Memo' ? bill : order?.bills?.find((b) => b.billType === 'Memo');
  const gstBill = bill?.billType === 'GST' ? bill : order?.bills?.find((b) => b.billType === 'GST');
  const resolvedQuotation = quotation || order?.quotation;
  const customer = bill?.customer || resolvedQuotation?.customer;
  const docNumber = bill?.billNumber || resolvedQuotation?.quotationNumber || '';

  const docs = [
    { key: 'Quotation', label: 'Quotation', available: !!resolvedQuotation },
    { key: 'Memo', label: 'Memo', available: !!memoBill, billId: memoBill?.id },
    { key: 'GST', label: 'GST Bill', available: !!gstBill, billId: gstBill?.id },
  ].filter((d) => d.available);

  const defaultDoc = bill ? (bill.billType === 'GST' ? 'GST' : 'Memo') : 'Quotation';
  const [docTypes, setDocTypes] = useState([defaultDoc]); // click to select — multiple documents send together
  const [toOwner, setToOwner] = useState(true);
  const [toCustomer, setToCustomer] = useState(false);
  const [savedNumbers, setSavedNumbers] = useState(loadSaved);
  const [checkedNumbers, setCheckedNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState('');
  const [rememberNew, setRememberNew] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const defaultDoc = bill ? (bill.billType === 'GST' ? 'GST' : 'Memo') : 'Quotation';
    setDocTypes([defaultDoc]);
  }, [quotation?.id, bill?.id]);

  if (!quotation && !bill) return null;

  const toggleDoc = (key) => {
    setDocTypes((list) => (list.includes(key) ? list.filter((d) => d !== key) : [...list, key]));
  };

  const persistSaved = (list) => {
    setSavedNumbers(list);
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  };

  const addNumber = () => {
    const digits = newNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Enter a valid mobile number (10 digits)');
      return;
    }
    if (rememberNew && !savedNumbers.includes(digits)) persistSaved([...savedNumbers, digits]);
    if (!checkedNumbers.includes(digits)) setCheckedNumbers([...checkedNumbers, digits]);
    setNewNumber('');
  };

  const toggleNumber = (num) => {
    setCheckedNumbers((list) => (list.includes(num) ? list.filter((n) => n !== num) : [...list, num]));
  };

  const removeSaved = (num) => {
    persistSaved(savedNumbers.filter((n) => n !== num));
    setCheckedNumbers((list) => list.filter((n) => n !== num));
  };

  const handleSend = async () => {
    if (!toOwner && !toCustomer && checkedNumbers.length === 0) {
      toast.error('Pick at least one recipient');
      return;
    }
    if (docTypes.length === 0) {
      toast.error('Select at least one document to share');
      return;
    }
    setSending(true);
    try {
      const allFailed = [];
      for (const key of docTypes) {
        const doc = docs.find((d) => d.key === key);
        if (!doc) continue;
        const res = await sendDocumentViaWhatsapp({
          quotationId: resolvedQuotation?.id || undefined,
          documentType: key,
          billId: doc.billId,
          sendToOwner: toOwner,
          sendToCustomer: toCustomer,
          extraNumbers: checkedNumbers,
          message: message || undefined,
        });
        allFailed.push(...res.data.data.filter((r) => r.status === 'Failed').map((r) => ({ ...r, doc: key })));
      }
      if (allFailed.length > 0) {
        toast.error(`Failed: ${allFailed.map((f) => `${f.doc} → ${f.label}`).join(', ')} — ${allFailed[0].error || ''}`);
      } else {
        toast.success(`${docTypes.join(' + ')} sent on WhatsApp`);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={!!quotation || !!bill} onClose={onClose} title={`Share ${docNumber} on WhatsApp`}>
      <div className="space-y-4">
        <div>
          <Label>Which documents (click to select — send together)</Label>
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => {
              const active = docTypes.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDoc(d.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-navy-300'
                  }`}
                >
                  {active ? '✓ ' : ''}{d.label}
                </button>
              );
            })}
          </div>
          {docs.length === 1 && <p className="text-[11px] text-gray-400 mt-1">Memo/GST bill appear here once they're generated.</p>}
        </div>

        <div>
          <Label>Send to</Label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={toOwner} onChange={(e) => setToOwner(e.target.checked)} />
              Owner <span className="text-xs text-gray-400">(number from Settings)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={toCustomer} onChange={(e) => setToCustomer(e.target.checked)} />
              Customer <span className="text-xs text-gray-400">({customer?.name} · {customer?.mobile})</span>
            </label>
            {savedNumbers.map((num) => (
              <label key={num} className="flex items-center gap-2 text-sm group">
                <input type="checkbox" checked={checkedNumbers.includes(num)} onChange={() => toggleNumber(num)} />
                {num} <span className="text-xs text-gray-400">(saved)</span>
                <button type="button" className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500" onClick={() => removeSaved(num)} title="Remove saved number">
                  <X size={13} />
                </button>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Add another number</Label>
          <div className="flex gap-2">
            <Input type="tel" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="10-digit mobile" />
            <Button type="button" variant="outline" onClick={addNumber}><Plus size={14} /> Add</Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
            <input type="checkbox" checked={rememberNew} onChange={(e) => setRememberNew(e.target.checked)} />
            Save this number for next time
          </label>
        </div>

        <div>
          <Label>Message with the PDF (optional)</Label>
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`${docTypes.join(' + ') || 'Documents'} for ${customer?.name} — ${docNumber}`} />
        </div>

        <Button variant="accent" className="w-full justify-center" onClick={handleSend} disabled={sending}>
          <Send size={14} /> {sending ? 'Sending...' : 'Send PDF on WhatsApp'}
        </Button>
      </div>
    </Modal>
  );
}
