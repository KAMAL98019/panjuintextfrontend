import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Check, Lock } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Label, Textarea } from './form/Field';
import * as quotationsApi from '../api/quotations';
import * as ordersApi from '../api/orders';

// The customer journey in plain steps. Quotation stages happen before the order is
// confirmed; work stages after. Payments are NOT here — they update automatically
// when payments are recorded.
const QUOTATION_STEPS = [
  { value: 'Draft', label: 'Draft', hint: 'Quotation written, not sent yet' },
  { value: 'Sent', label: 'Sent to Customer', hint: 'Waiting for customer response' },
  { value: 'UnderNegotiation', label: 'Under Negotiation', hint: 'Bargaining on price' },
];
const WORK_STEPS = [
  { value: 'Confirmed', label: 'Order Confirmed', hint: 'Customer said yes' },
  { value: 'MaterialOrdered', label: 'Material Ordered', hint: 'Materials purchased/booked' },
  { value: 'WorkStarted', label: 'Work Started', hint: 'Stitching / fabrication going on' },
  { value: 'Installation', label: 'Installation', hint: 'Fitting at the customer site' },
  { value: 'Completed', label: 'Work Completed', hint: 'Job finished and handed over' },
];

function Step({ step, state, onClick }) {
  // state: 'done' | 'current' | 'available' | 'locked'
  const clickable = state === 'available' || state === 'current';
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        state === 'current' ? 'bg-navy-900 text-white'
        : state === 'done' ? 'bg-lime-50 text-gray-500'
        : state === 'locked' ? 'opacity-45 cursor-not-allowed'
        : 'hover:bg-gray-50'
      }`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        state === 'done' ? 'bg-lime-400 text-navy-900'
        : state === 'current' ? 'bg-lime-400 text-navy-900'
        : 'bg-gray-100 text-gray-400'
      }`}>
        {state === 'done' ? <Check size={13} /> : state === 'locked' ? <Lock size={11} /> : ''}
      </span>
      <span>
        <span className={`block text-sm font-semibold ${state === 'current' ? 'text-white' : 'text-navy-900'}`}>{step.label}</span>
        <span className={`block text-xs ${state === 'current' ? 'text-gray-300' : 'text-gray-400'}`}>{step.hint}</span>
      </span>
    </button>
  );
}

/**
 * One tracking modal for the whole journey. Before the order is confirmed you move the
 * quotation between Draft/Sent/Negotiation (work stages are locked); after confirmation
 * you move the job through Material → Work → Installation → Completed. Advance/pending
 * amounts are intentionally absent — they follow recorded payments automatically.
 */
export default function TrackingStatusModal({ quotation, onClose, onSaved }) {
  const order = quotation?.order;
  const isConfirmed = !!order;
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!quotation) return;
    // Payment-derived order statuses (AdvancePaid, and the legacy FullyPaid value some
    // already-existing orders still carry) aren't manually selectable; show the nearest
    // manual stage as current instead — FullyPaid means the job reads as done, everything
    // else (e.g. AdvancePaid) just means the order hasn't left "Confirmed" yet.
    const current = isConfirmed
      ? (WORK_STEPS.some((s) => s.value === order.currentStatus)
          ? order.currentStatus
          : (order.currentStatus === 'FullyPaid' ? 'Completed' : 'Confirmed'))
      : (QUOTATION_STEPS.some((s) => s.value === quotation.status) ? quotation.status : 'Draft');
    setSelected(current);
    setNotes(quotation.remarks || '');
  }, [quotation, isConfirmed, order]);

  if (!quotation) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isConfirmed) {
        await ordersApi.updateOrderTracking(order.id, { status: selected, notes });
      } else {
        await quotationsApi.updateQuotationStatus(quotation.id, selected, notes);
      }
      toast.success('Tracking updated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tracking');
    } finally {
      setSaving(false);
    }
  };

  const stateFor = (step, group) => {
    if (group === 'quotation') {
      if (isConfirmed) return 'done';
      return step.value === selected ? 'current' : 'available';
    }
    if (!isConfirmed) return 'locked';
    const idx = WORK_STEPS.findIndex((s) => s.value === step.value);
    const selIdx = WORK_STEPS.findIndex((s) => s.value === selected);
    if (step.value === selected) return 'current';
    return idx < selIdx ? 'done' : 'available';
  };

  return (
    <Modal open={!!quotation} onClose={onClose} title={`Tracking — ${quotation.quotationNumber}`}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          {isConfirmed
            ? 'Tap the stage the job is at right now. Payment status updates by itself when you record payments.'
            : 'This quotation is not confirmed yet — move it between the quotation stages. Work stages unlock after you confirm the order.'}
        </p>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">1 · Quotation Stage</p>
          <div className="space-y-1">
            {QUOTATION_STEPS.map((step) => (
              <Step key={step.value} step={step} state={stateFor(step, 'quotation')} onClick={() => setSelected(step.value)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">2 · Work Stage {!isConfirmed && '(unlocks after order confirmation)'}</p>
          <div className="space-y-1">
            {WORK_STEPS.map((step) => (
              <Step key={step.value} step={step} state={stateFor(step, 'work')} onClick={() => setSelected(step.value)} />
            ))}
          </div>
        </div>

        <div>
          <Label>Internal Notes (only you see this)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Customer asked to call after 20th..." />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </Modal>
  );
}
