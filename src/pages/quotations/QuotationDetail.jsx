import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, StickyNote, ReceiptText, Plus, FileText, Pencil, ArrowLeft } from 'lucide-react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useConfirm } from '../../components/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import ItemsEditor, { lineAmountFor } from '../../components/ItemsEditor';
import QuotationPreviewCard from '../../components/documents/QuotationPreviewCard';
import { Label, Input, Select, Textarea } from '../../components/form/Field';
import * as quotationsApi from '../../api/quotations';
import * as ordersApi from '../../api/orders';
import { getSettings } from '../../api/settings';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const ORDER_TIMELINE = [
  'QuotationCreated', 'Sent', 'Negotiation', 'Confirmed', 'AdvancePaid',
  'MaterialOrdered', 'WorkStarted', 'Installation', 'Completed', 'FullyPaid',
];
const MANUAL_STATUSES = ['MaterialOrdered', 'WorkStarted', 'Installation', 'Completed'];

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [quotation, setQuotation] = useState(null);

  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseItems, setReviseItems] = useState([]);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [settings, setSettings] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState('');
  const [billChoiceOrder, setBillChoiceOrder] = useState(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('Advance');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [payRemarks, setPayRemarks] = useState('');

  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountRemarks, setDiscountRemarks] = useState('');

  const [previewTab, setPreviewTab] = useState(null); // 'quotation' | 'memo' | 'gst' | null

  const load = useCallback(() => {
    quotationsApi.getQuotation(id).then((res) => setQuotation(res.data.data));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getSettings().then((res) => setSettings(res.data.data)); }, []);

  if (!quotation) {
    return <Layout><Spinner size={36} label="Loading quotation..." className="py-24" /></Layout>;
  }

  const canModify = !['Confirmed', 'Cancelled'].includes(quotation.status);
  const order = quotation.order;
  const reviseMode = quotation.quotationType === 'GST' ? 'gst' : 'nongst';

  const timelineItems = [
    { title: `Quotation created (${formatCurrency(quotation.subtotal)} base)`, date: quotation.createdAt },
    ...quotation.revisions.map((r) => ({
      title: `Revised: ${formatCurrency(r.previousAmount)} → ${formatCurrency(r.newAmount)}${r.reason ? ` (${r.reason})` : ''}`,
      description: r.remarks,
      date: r.createdAt,
    })),
    ...(quotation.status === 'Confirmed'
      ? [{ title: `Order confirmed at ${formatCurrency(quotation.total)}`, date: quotation.updatedAt }]
      : []),
  ];

  const openRevise = () => {
    setReviseItems(
      quotation.items.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        gstPercent: item.gstPercent || 0,
      }))
    );
    setReason(''); setRemarks('');
    setReviseOpen(true);
  };

  const handleRevise = async (e) => {
    e.preventDefault();
    if (reviseItems.length === 0 || reviseItems.some((i) => !i.description || !i.quantity || !i.unitPrice)) {
      toast.error('Every item needs a description, quantity and rate');
      return;
    }
    try {
      const items = reviseItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent) || 0,
        gstPercent: Number(item.gstPercent) || 0,
      }));
      await quotationsApi.reviseQuotation(id, { items, reason, remarks });
      toast.success('Quotation revised');
      setReviseOpen(false);
      setReason(''); setRemarks('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revise');
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    try {
      const res = await quotationsApi.confirmQuotation(id, { assignedStaff });
      toast.success('Order confirmed');
      setConfirmOpen(false);
      load();
      setBillChoiceOrder(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: `Cancel ${quotation.quotationNumber}?`,
      message: 'The quotation is marked Cancelled and can no longer be revised or confirmed.',
      confirmText: 'Cancel Quotation',
      cancelText: 'Keep It',
      danger: true,
    });
    if (!ok) return;
    try {
      await quotationsApi.updateQuotationStatus(id, 'Cancelled');
      toast.success('Quotation cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleAdvanceStatus = async (status) => {
    try {
      await ordersApi.updateOrderStatus(order.id, status);
      toast.success(`Status updated to ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await ordersApi.createPayment(order.id, { type: paymentType, amount: Number(amount), paymentMode, remarks: payRemarks });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      setAmount(''); setPayRemarks('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const openDiscount = () => {
    setDiscountAmount(String(order.paymentInfo.pending));
    setDiscountReason(''); setDiscountRemarks('');
    setDiscountOpen(true);
  };

  const discountNum = Number(discountAmount) || 0;
  const discountNewTotal = order ? quotation.total - discountNum : 0;
  const discountNewPending = order ? Math.max(discountNewTotal - order.paymentInfo.paid, 0) : 0;

  const handleDiscount = async (e) => {
    e.preventDefault();
    try {
      await ordersApi.applyDiscount(order.id, {
        newAmount: discountNewTotal,
        reason: discountReason,
        remarks: discountRemarks,
      });
      toast.success('Discount applied');
      setDiscountOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply discount');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Quotations &gt; {quotation.quotationNumber}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/quotations')}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-navy-900"
              title="Back to quotations"
            >
              <ArrowLeft size={17} />
            </button>
            <h1 className="text-2xl font-bold text-navy-900">{quotation.quotationNumber}</h1>
            <StatusBadge status={quotation.status} />
            {order && <StatusBadge status={order.currentStatus} />}
            {order && <StatusBadge status={order.paymentInfo.status} />}
          </div>
          <Link to={`/customers/${quotation.customer.id}`} className="text-sm text-gray-500 hover:underline">
            {quotation.customer.name} &middot; {quotation.customer.mobile}
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewTab('quotation')}><FileText size={15} /> View Documents</Button>
          {canModify && <Button variant="outline" onClick={() => navigate(`/quotations/${id}/edit`)}><Pencil size={14} /> Edit</Button>}
          {canModify && <Button variant="outline" onClick={openRevise}>Revise Amount</Button>}
          {canModify && !order && <Button variant="accent" onClick={() => setConfirmOpen(true)}>Confirm Order</Button>}
          {order && order.paymentInfo.pending > 0 && (
            <Button variant="accent" onClick={() => setPaymentOpen(true)}><Plus size={15} /> Record Payment</Button>
          )}
          {order && order.paymentInfo.pending > 0 && (
            <Button variant="outline" onClick={openDiscount}>Settle with Discount</Button>
          )}
          {canModify && <Button variant="danger" onClick={handleCancel}>Cancel</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-navy-900 mb-4">Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="py-2">Description</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Rate</th>
                  {quotation.quotationType === 'GST' && <th className="py-2">GST%</th>}
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">{item.description}{item.hsnCode && <span className="text-gray-400 text-xs ml-1">({item.hsnCode})</span>}</td>
                    <td className="py-2">{item.quantity} {item.unit}</td>
                    <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                    {quotation.quotationType === 'GST' && <td className="py-2">{item.gstPercent}%</td>}
                    <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm max-w-xs ml-auto">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(quotation.subtotal)}</span></div>
              {quotation.discountAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatCurrency(quotation.discountAmount)}</span></div>}
              {quotation.cgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(quotation.cgst)}</span></div>}
              {quotation.sgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(quotation.sgst)}</span></div>}
              {quotation.igst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(quotation.igst)}</span></div>}
              <div className="flex justify-between font-bold text-navy-900 text-base pt-1"><span>Total</span><span>{formatCurrency(quotation.total)}</span></div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-navy-900 mb-4">Negotiation / Bargaining History</h3>
            <Timeline items={timelineItems} />
          </section>

          {order && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-navy-900 mb-4">Work Status Timeline</h3>
              <div className="flex flex-wrap gap-2">
                {ORDER_TIMELINE.map((status, idx) => {
                  const currentIndex = ORDER_TIMELINE.indexOf(order.currentStatus);
                  const done = idx <= currentIndex;
                  const manual = MANUAL_STATUSES.includes(status);
                  return (
                    <button
                      key={status}
                      disabled={!manual || idx <= currentIndex}
                      onClick={() => handleAdvanceStatus(status)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        done ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-400 border-gray-200'
                      } ${manual && idx > currentIndex ? 'hover:bg-lime-400 hover:text-navy-900 hover:border-lime-400 cursor-pointer' : ''}`}
                    >
                      {status.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Payment-driven statuses (Advance Paid / Fully Paid) update automatically when payments are recorded.
                Click an upcoming stage above to advance manually.
              </p>
            </section>
          )}

          {order && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-navy-900 mb-4">Payments</h3>
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase">Total</p>
                  <p className="font-bold text-navy-900">{formatCurrency(quotation.total)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase">Paid</p>
                  <p className="font-bold text-green-600">{formatCurrency(order.paymentInfo.paid)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase">Pending</p>
                  <p className="font-bold text-red-500">{formatCurrency(order.paymentInfo.pending)}</p>
                </div>
              </div>

              {order.payments.length === 0 ? (
                <p className="text-sm text-gray-400">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="py-2">Type</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Mode</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2">{p.type}</td>
                        <td className="py-2 font-medium">{formatCurrency(p.amount)}</td>
                        <td className="py-2">{p.paymentMode}</td>
                        <td className="py-2">{formatDateTime(p.paymentDate)}</td>
                        <td className="py-2 text-gray-500">{p.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {order && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy-900">Generated Bills</h3>
                <div className="flex gap-2">
                  {!order.bills.some((b) => b.billType === 'Memo') && (
                    <Button variant="outline" onClick={() => navigate(`/bills/new?type=Memo&orderId=${order.id}`)}><StickyNote size={14} /> Create Memo</Button>
                  )}
                  {quotation.quotationType === 'GST' && !order.bills.some((b) => b.billType === 'GST') && (
                    <Button variant="outline" onClick={() => navigate(`/bills/new?type=GST&orderId=${order.id}`)}><ReceiptText size={14} /> Create GST Bill</Button>
                  )}
                </div>
              </div>
              {order.bills.length === 0 ? (
                <p className="text-sm text-gray-400">No bills generated yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {order.bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{bill.billNumber}</p>
                        <p className="text-xs text-gray-400">{bill.billType} &middot; {formatDate(bill.generatedAt)}</p>
                      </div>
                      <Button variant="outline" onClick={() => setPreviewTab(bill.billType === 'GST' ? 'gst' : 'memo')}>View / Print</Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5 text-sm space-y-2">
            <h3 className="font-bold text-navy-900 mb-2">Details</h3>
            <p><span className="text-gray-400">Type: </span>{quotation.quotationType}</p>
            <p><span className="text-gray-400">Validity: </span>{quotation.validityDays} days</p>
            <p><span className="text-gray-400">Created: </span>{formatDate(quotation.createdAt)}</p>
            {quotation.remarks && <p><span className="text-gray-400">Remarks: </span>{quotation.remarks}</p>}
          </section>

          {order && (
            <section className="bg-white border border-gray-200 rounded-xl p-5 text-sm space-y-2">
              <h3 className="font-bold text-navy-900 mb-2">Order Details</h3>
              <p><span className="text-gray-400">Order No: </span>{order.orderNumber}</p>
              <p><span className="text-gray-400">Order Date: </span>{formatDate(order.orderDate)}</p>
              <p><span className="text-gray-400">Expected Completion: </span>{order.expectedCompletion ? formatDate(order.expectedCompletion) : '-'}</p>
              <p><span className="text-gray-400">Assigned Staff: </span>{order.assignedStaff || '-'}</p>
            </section>
          )}

          <div className="bg-gray-100 rounded-xl p-4">
            <QuotationPreviewCard
              company={settings}
              customer={quotation.customer}
              quotationNumber={quotation.quotationNumber}
              date={quotation.createdAt}
              quotationType={quotation.quotationType}
              items={quotation.items}
              subtotal={quotation.subtotal}
              discountAmount={quotation.discountAmount}
              total={quotation.total}
              remarks={quotation.remarks}
              terms={quotation.terms}
              validityDays={quotation.validityDays}
            />
          </div>
        </div>
      </div>

      <Modal open={reviseOpen} onClose={() => setReviseOpen(false)} title="Revise Quotation Amount" width="max-w-6xl">
        <form onSubmit={handleRevise} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Current total: <strong>{formatCurrency(quotation.total)}</strong> — bargain over the actual product/price
              list below, like the paper quotation; the new total is computed from these items.
            </p>
            <ItemsEditor items={reviseItems} onChange={setReviseItems} mode={reviseMode} />
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer bargained" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <Button type="submit" variant="accent" className="w-full justify-center">Save Revision</Button>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 max-h-[80vh] overflow-y-auto">
            <QuotationPreviewCard
              company={settings}
              customer={quotation.customer}
              quotationNumber={quotation.quotationNumber}
              date={quotation.createdAt}
              quotationType={quotation.quotationType}
              items={reviseItems}
              subtotal={reviseItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)}
              discountAmount={reviseItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * ((Number(item.discountPercent) || 0) / 100), 0)}
              total={reviseItems.reduce((sum, item) => sum + lineAmountFor(reviseMode, item), 0)}
              remarks={quotation.remarks}
              terms={quotation.terms}
              validityDays={quotation.validityDays}
            />
          </div>
        </form>
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Order">
        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-sm text-gray-500">
            This will lock the quotation at <strong>{formatCurrency(quotation.total)}</strong> and create a confirmed order.
          </p>
          <div>
            <Label>Assigned Staff (optional)</Label>
            <Input value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} placeholder="e.g. Venkatesh" />
          </div>
          <Button type="submit" variant="accent" className="w-full justify-center">Confirm Order</Button>
        </form>
      </Modal>

      <Modal
        open={!!billChoiceOrder}
        onClose={() => setBillChoiceOrder(null)}
        title="Order Confirmed — Give a Bill to the Customer"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Order <strong>{billChoiceOrder?.orderNumber}</strong> is confirmed at{' '}
            <strong>{formatCurrency(quotation.total)}</strong>. Generate the bill to hand to the customer now,
            or skip and do it later from below.
          </p>

          {quotation.quotationType === 'GST' && !quotation.customer.gstNumber && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-xs">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>This customer has no GSTIN on file — the GST bill will print as "Unregistered".</span>
            </div>
          )}

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-xs">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>No advance payment has been recorded yet — the full amount will show as pending until a payment is added below.</span>
          </div>

          <div className={`grid gap-3 pt-1 ${quotation.quotationType === 'GST' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={() => navigate(`/bills/new?type=Memo&orderId=${order.id}`)}
              className="flex flex-col items-center gap-2 border border-gray-200 rounded-lg p-4 hover:border-navy-300 hover:bg-gray-50"
            >
              <StickyNote size={20} className="text-navy-900" />
              <span className="text-sm font-semibold">Memo Bill</span>
            </button>
            {quotation.quotationType === 'GST' && (
              <button
                type="button"
                onClick={() => navigate(`/bills/new?type=GST&orderId=${order.id}`)}
                className="flex flex-col items-center gap-2 border border-gray-200 rounded-lg p-4 hover:border-navy-300 hover:bg-gray-50"
              >
                <ReceiptText size={20} className="text-navy-900" />
                <span className="text-sm font-semibold">GST Bill</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setBillChoiceOrder(null)}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 pt-1"
          >
            Skip for now
          </button>
        </div>
      </Modal>

      {order && (
        <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment">
          <form onSubmit={handlePayment} className="space-y-4">
            <p className="text-sm text-gray-500">Pending balance: <strong>{formatCurrency(order.paymentInfo.pending)}</strong></p>
            <div>
              <Label>Payment Type</Label>
              <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="Advance">Advance</option>
                <option value="Partial">Partial</option>
                <option value="Final">Final</option>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </Select>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea rows={2} value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} />
            </div>
            <Button type="submit" variant="accent" className="w-full justify-center">Save Payment</Button>
          </form>
        </Modal>
      )}

      {order && (
        <Modal open={discountOpen} onClose={() => setDiscountOpen(false)} title="Settle with Discount">
          <form onSubmit={handleDiscount} className="space-y-4">
            <p className="text-sm text-gray-500">
              Current total: <strong>{formatCurrency(quotation.total)}</strong> &middot; Paid so far:{' '}
              <strong>{formatCurrency(order.paymentInfo.paid)}</strong> &middot; Pending:{' '}
              <strong>{formatCurrency(order.paymentInfo.pending)}</strong>
            </p>
            <p className="text-xs text-gray-400">
              Enter how much to write off. Prefilled with the full pending balance — lower it for a
              partial discount.
            </p>
            <div>
              <Label>Discount Amount</Label>
              <Input
                type="number"
                step="0.01"
                required
                min="0.01"
                max={quotation.total}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">New Total</span><span className="font-medium">{formatCurrency(discountNewTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">New Pending</span><span className="font-bold text-navy-900">{formatCurrency(discountNewPending)}</span></div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="e.g. Goodwill discount after completion" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea rows={2} value={discountRemarks} onChange={(e) => setDiscountRemarks(e.target.value)} />
            </div>
            <Button type="submit" variant="accent" className="w-full justify-center">Apply Discount</Button>
          </form>
        </Modal>
      )}

      {previewTab && (
        <DocumentPreviewModal
          quotation={quotation}
          initialTab={previewTab}
          onClose={() => setPreviewTab(null)}
          onRequestCustomize={(type) => navigate(`/bills/new?type=${type}&orderId=${order.id}`)}
        />
      )}

    </Layout>
  );
}
