import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Send } from 'lucide-react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import ItemsEditor, { lineAmountFor } from '../../components/ItemsEditor';
import { Label, Input, Textarea, Select } from '../../components/form/Field';
import MemoPreviewCard from '../../components/documents/MemoPreviewCard';
import GstBillPreviewCard from '../../components/documents/GstBillPreviewCard';
import ShareDocumentModal from '../../components/ShareDocumentModal';
import * as customersApi from '../../api/customers';
import * as ordersApi from '../../api/orders';
import * as billsApi from '../../api/bills';
import { getSettings } from '../../api/settings';

/**
 * Full-page Memo / GST bill form — works three ways:
 *  - /bills/new?type=Memo|GST                → standalone bill for any customer (like the paper pad)
 *  - /bills/new?type=Memo|GST&orderId=N      → bill for a confirmed order, prefilled from its quotation
 *  - /bills/:id/edit                          → re-edit a saved bill in place (same bill number)
 * Left: customer + editable items + pad fields. Right: live replica of the physical pad.
 */
export default function BillFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!editId;

  const [billType, setBillType] = useState(searchParams.get('type') === 'GST' ? 'GST' : 'Memo');
  const orderId = searchParams.get('orderId');
  const mode = billType === 'Memo' ? 'memo' : 'gst';

  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState('existing');
  const [customerId, setCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', address: '' });
  const [order, setOrder] = useState(null);
  const [editNumber, setEditNumber] = useState('');
  const [bill, setBill] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  const [items, setItems] = useState([{ description: '', shadeCode: '', quantity: 1, unit: 'sqft', unitPrice: '' }]);
  const [fields, setFields] = useState({
    recipientName: '', recipientCell: '', deliveryAddress: '',
    materialsDeliveryDate: '', jobExecutionPeriod: '', remarks: '', advancePayment: '',
    placeOfSupply: '', dateOfSupply: new Date().toISOString().slice(0, 10),
    modeOfTransport: '', vehicleNo: '', transporterName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    getSettings().then((res) => setSettings(res.data.data));
    customersApi.listCustomers({ limit: 500 }).then((res) => setCustomers(res.data.data));
  }, []);

  // Order-linked: prefill customer + items from the confirmed order's quotation
  useEffect(() => {
    if (!orderId || isEdit) return;
    ordersApi.getOrder(orderId).then((res) => {
      const o = res.data.data;
      setOrder(o);
      setCustomerId(String(o.quotation.customerId));
      setItems(o.quotation.items.map((item) => ({
        description: item.description,
        shadeCode: item.hsnCode || '',
        hsnCode: item.hsnCode || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        gstPercent: item.gstPercent || 0,
      })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Edit mode: load the saved bill
  useEffect(() => {
    if (!isEdit) return;
    billsApi.getBill(editId).then((res) => {
      const bill = res.data.data;
      setBill(bill);
      setBillType(bill.billType);
      setEditNumber(bill.billNumber);
      if (bill.orderId) setOrder(bill.order);
      setCustomerId(String(bill.customer?.id || ''));
      const cf = bill.snapshot?.customFields || {};
      setItems((bill.snapshot?.quotation?.items || []).map((item) => ({
        description: item.description,
        shadeCode: item.shadeCode || item.hsnCode || '',
        hsnCode: item.hsnCode || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        gstPercent: item.gstPercent || 0,
      })));
      setFields((f) => ({
        ...f,
        ...cf,
        materialsDeliveryDate: cf.materialsDeliveryDate ? cf.materialsDeliveryDate.slice(0, 10) : '',
        dateOfSupply: cf.dateOfSupply ? cf.dateOfSupply.slice(0, 10) : f.dateOfSupply,
        advancePayment: cf.advancePayment ?? '',
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editId]);

  const selectedCustomer = useMemo(
    () => (customerMode === 'existing' ? customers.find((c) => String(c.id) === String(customerId)) : newCustomer),
    [customerMode, customers, customerId, newCustomer]
  );

  const previewTotal = items.reduce((sum, item) => sum + lineAmountFor(mode, item), 0);
  const advance = order ? order.paymentInfo?.paid || 0 : Number(fields.advancePayment) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || items.some((i) => !i.description || !i.quantity || !i.unitPrice)) {
      toast.error('Every item needs a description, quantity and rate');
      return;
    }
    if (!order && customerMode === 'existing' && !customerId) {
      toast.error('Select a customer');
      return;
    }
    if (!order && customerMode === 'new' && !(newCustomer.name && newCustomer.mobile && newCustomer.address)) {
      toast.error("Fill in the new customer's name, mobile and address");
      return;
    }

    const submittedItems = items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: item.discountPercent !== undefined ? Number(item.discountPercent) : undefined,
      gstPercent: item.gstPercent !== undefined ? Number(item.gstPercent) : undefined,
    }));

    const customFields = billType === 'Memo'
      ? {
          recipientName: fields.recipientName || undefined,
          recipientCell: fields.recipientCell || undefined,
          deliveryAddress: fields.deliveryAddress || undefined,
          materialsDeliveryDate: fields.materialsDeliveryDate || undefined,
          jobExecutionPeriod: fields.jobExecutionPeriod || undefined,
          remarks: fields.remarks || undefined,
          advancePayment: order ? undefined : Number(fields.advancePayment) || 0,
        }
      : {
          placeOfSupply: fields.placeOfSupply || undefined,
          dateOfSupply: fields.dateOfSupply || undefined,
          modeOfTransport: fields.modeOfTransport || undefined,
          vehicleNo: fields.vehicleNo || undefined,
          transporterName: fields.transporterName || undefined,
        };

    setSubmitting(true);
    try {
      let res;
      if (isEdit) {
        res = await billsApi.updateBill(editId, { customerId: customerId || undefined, items: submittedItems, customFields });
        toast.success(`Bill ${res.data.data.billNumber} updated`);
      } else if (order) {
        res = await ordersApi.createBill(order.id, billType, customFields, submittedItems);
        toast.success(`${billType} bill generated: ${res.data.data.billNumber}`);
      } else {
        res = await billsApi.createStandaloneBill({
          billType,
          ...(customerMode === 'existing' ? { customerId: Number(customerId) } : { customer: newCustomer }),
          items: submittedItems,
          customFields,
        });
        toast.success(`${billType} bill created: ${res.data.data.billNumber}`);
      }

      if (!isEdit) {
        navigate(order ? `/quotations/${order.quotationId}` : '/bills');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!isEdit) return;
    setSubmitting(true);
    try {
      const doc = await billsApi.fetchBillPdf(editId);
      const a = document.createElement('a');
      a.href = doc.blobUrl;
      a.download = `${editNumber}.pdf`;
      a.click();
    } catch (err) {
      toast.error('Failed to download PDF');
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? `Edit ${editNumber}` : billType === 'Memo' ? 'New Memo Bill' : 'New GST Bill';

  return (
    <Layout>
      <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Bills &gt; {title}</p>
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-navy-900"
          title="Back to quotations"
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {order && (
          <span className="text-xs bg-lime-100 text-navy-900 font-semibold px-2.5 py-1 rounded-full">
            For order {order.orderNumber}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {!isEdit && !order && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy-900">Bill Type & Customer</h3>
                <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-semibold">
                  {['Memo', 'GST'].map((t) => (
                    <button key={t} type="button" onClick={() => setBillType(t)}
                      className={`px-3 py-1.5 rounded-md transition-colors ${billType === t ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}>
                      {t === 'GST' ? 'GST Bill' : 'Memo'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-semibold w-fit mb-4">
                <button type="button" onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1.5 rounded-md ${customerMode === 'existing' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}>Existing Customer</button>
                <button type="button" onClick={() => setCustomerMode('new')}
                  className={`px-3 py-1.5 rounded-md ${customerMode === 'new' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}>New Customer</button>
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <Label>Customer</Label>
                  <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">Select customer...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Name</Label><Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} /></div>
                    <div><Label>Mobile</Label><Input value={newCustomer.mobile} onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })} /></div>
                  </div>
                  <div><Label>Address</Label><Textarea rows={2} value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} /></div>
                </div>
              )}
            </section>
          )}

          {(isEdit || order) && selectedCustomer && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-navy-900 mb-1">Customer</h3>
              <p className="text-sm text-gray-600">{selectedCustomer.name} · {selectedCustomer.mobile}</p>
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-navy-900 mb-4">Items</h3>
            <ItemsEditor items={items} onChange={setItems} mode={mode} />
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-navy-900">{billType === 'Memo' ? 'Memo Details' : 'Invoice Details'}</h3>
            {billType === 'Memo' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Name (on Memo)</Label><Input value={fields.recipientName} onChange={setField('recipientName')} placeholder="Defaults to customer name" /></div>
                  <div><Label>Cell</Label><Input value={fields.recipientCell} onChange={setField('recipientCell')} placeholder="Defaults to customer mobile" /></div>
                </div>
                <div><Label>Address (on Memo)</Label><Textarea rows={2} value={fields.deliveryAddress} onChange={setField('deliveryAddress')} placeholder="Defaults to customer address" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Materials Delivery Date</Label><Input type="date" value={fields.materialsDeliveryDate} onChange={setField('materialsDeliveryDate')} /></div>
                  <div><Label>Job Execution Period</Label><Input value={fields.jobExecutionPeriod} onChange={setField('jobExecutionPeriod')} placeholder="e.g. 15 working days" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Remarks</Label><Input value={fields.remarks} onChange={setField('remarks')} /></div>
                  {!order && (
                    <div><Label>Advance Payment (₹)</Label><Input type="number" min="0" value={fields.advancePayment} onChange={setField('advancePayment')} placeholder="0" /></div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Place of Supply</Label><Input value={fields.placeOfSupply} onChange={setField('placeOfSupply')} placeholder="Defaults to customer state" /></div>
                  <div><Label>Date of Supply</Label><Input type="date" value={fields.dateOfSupply} onChange={setField('dateOfSupply')} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Mode of Transport</Label><Input value={fields.modeOfTransport} onChange={setField('modeOfTransport')} placeholder="e.g. Own vehicle" /></div>
                  <div><Label>Vehicle No.</Label><Input value={fields.vehicleNo} onChange={setField('vehicleNo')} /></div>
                </div>
                <div><Label>Transporter Name</Label><Input value={fields.transporterName} onChange={setField('transporterName')} /></div>
              </>
            )}
          </section>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="justify-center"
              onClick={() => navigate('/bills')}
            >
              <ArrowLeft size={15} /> Back
            </Button>
            <Button type="submit" variant="accent" className="flex-1 justify-center" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Bill'}
            </Button>
            {isEdit && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  className="justify-center"
                  onClick={handleDownload}
                  disabled={submitting}
                >
                  Download PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-center gap-1.5"
                  onClick={() => setShareTarget(bill)}
                  disabled={submitting}
                >
                  <Send size={14} /> Share
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 h-fit bg-gray-100 rounded-xl p-4 max-h-[85vh] overflow-y-auto">
          {billType === 'Memo' ? (
            <MemoPreviewCard
              company={settings}
              billNumber={editNumber}
              name={fields.recipientName || selectedCustomer?.name || ''}
              cell={fields.recipientCell || selectedCustomer?.mobile || ''}
              address={fields.deliveryAddress || selectedCustomer?.address || ''}
              items={items}
              total={previewTotal}
              advance={advance}
              balance={Math.max(previewTotal - advance, 0)}
              materialsDeliveryDate={fields.materialsDeliveryDate}
              jobExecutionPeriod={fields.jobExecutionPeriod}
              remarks={fields.remarks}
            />
          ) : (
            <GstBillPreviewCard
              company={settings}
              customer={selectedCustomer}
              billNumber={editNumber}
              items={items}
              placeOfSupply={fields.placeOfSupply}
              dateOfSupply={fields.dateOfSupply}
              modeOfTransport={fields.modeOfTransport}
              vehicleNo={fields.vehicleNo}
              transporterName={fields.transporterName}
            />
          )}
        </div>
      </form>
      {shareTarget && (
        <ShareDocumentModal bill={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </Layout>
  );
}
