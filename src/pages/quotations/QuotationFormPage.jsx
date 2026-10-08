import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { Label, Input, Select, Textarea } from '../../components/form/Field';
import QuotationPreviewCard from '../../components/documents/QuotationPreviewCard';
import * as customersApi from '../../api/customers';
import * as productsApi from '../../api/products';
import * as quotationsApi from '../../api/quotations';
import { getSettings } from '../../api/settings';
import { calculateTotalsPreview, groupByGstRatePreview } from '../../utils/gstPreview';
import { formatCurrency } from '../../utils/format';

const emptyItem = { description: '', hsnCode: '', quantity: 1, unit: 'sqft', unitPrice: '', discountPercent: 0, gstPercent: 18, productId: '' };

// Unsaved typing on this form is kept in localStorage so navigating away (back button,
// accidental link click, refresh) never loses an in-progress quotation.
const DRAFT_KEY = 'panjuintext_quotation_draft';

// Compact inputs for the one-row-per-item grid (red border marks a missing required value)
const cellInput = (hasError) =>
  `w-full border rounded-md px-2 py-1.5 text-sm outline-none bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 ${hasError ? 'border-red-400' : 'border-gray-200'}`;

export default function QuotationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams(); // present on /quotations/:id/edit — full re-edit of a saved quotation
  const isEdit = !!editId;
  const [editNumber, setEditNumber] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customerMode, setCustomerMode] = useState(location.state?.customerId ? 'existing' : 'new');

  const { register, control, handleSubmit, watch, setValue, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      customerId: location.state?.customerId || '',
      customer: { name: '', mobile: '', altMobile: '', email: '', address: '', city: '', state: '', pincode: '', gstNumber: '', customerType: 'Individual' },
      quotationType: 'GST',
      remarks: '',
      terms: '',
      validityDays: 7,
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    customersApi.listCustomers({ limit: 500 }).then((res) => setCustomers(res.data.data));
    productsApi.listProducts({ limit: 500, status: 'Active' }).then((res) => setProducts(res.data.data));
    getSettings().then((res) => setSettings(res.data.data));
  }, []);

  // Edit mode: load the saved quotation and pre-fill the whole form with it
  useEffect(() => {
    if (!isEdit) return;
    quotationsApi.getQuotation(editId).then((res) => {
      const q = res.data.data;
      if (q.status === 'Cancelled') {
        toast.error('Cannot edit a Cancelled quotation');
        navigate(`/quotations/${editId}`);
        return;
      }
      setEditNumber(q.quotationNumber);
      setCustomerMode('existing');
      const subjectMatch = (q.remarks || '').match(/^Quotation for (.*?)(?: reg\.)?$/);
      reset({
        customerId: String(q.customerId),
        customer: { name: '', mobile: '', altMobile: '', email: '', address: '', city: '', state: '', pincode: '', gstNumber: '', customerType: 'Individual' },
        quotationType: q.quotationType,
        remarks: subjectMatch ? subjectMatch[1] : (q.remarks || ''),
        terms: q.terms || '',
        validityDays: q.validityDays,
        items: q.items.map((item) => ({
          productId: item.productId ? String(item.productId) : '',
          description: item.description,
          hsnCode: item.hsnCode || '',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          gstPercent: item.gstPercent || 0,
        })),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editId]);

  // Restore the unsaved draft once on mount (create mode only, skipped when arriving from a customer page)
  useEffect(() => {
    if (isEdit || location.state?.customerId) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        reset(draft.values);
        if (draft.customerMode) setCustomerMode(draft.customerMode);
        // id dedupes the toast when React StrictMode double-runs this effect in dev
        toast('Restored your unsaved draft', { icon: '📝', id: 'draft-restored' });
      }
    } catch { /* corrupt draft — start fresh */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save everything typed (create mode only; re-subscribes when customerMode toggles)
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((values) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, customerMode }));
    });
    return () => subscription.unsubscribe();
  }, [watch, customerMode, isEdit]);

  const watchItems = watch('items');
  const watchCustomerId = watch('customerId');
  const watchInlineCustomer = watch('customer');
  const watchType = watch('quotationType');

  const selectedExistingCustomer = customers.find((c) => String(c.id) === String(watchCustomerId));
  const selectedCustomer = customerMode === 'existing' ? selectedExistingCustomer : watchInlineCustomer;

  const isInterState = !!(settings?.state && selectedCustomer?.state &&
    settings.state.trim().toLowerCase() !== selectedCustomer.state.trim().toLowerCase());

  const totals = calculateTotalsPreview({ items: watchItems || [], quotationType: watchType, isInterState });

  const applyProduct = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;
    setValue(`items.${index}.description`, product.name);
    setValue(`items.${index}.hsnCode`, product.hsnCode || '');
    setValue(`items.${index}.unit`, product.unit);
    setValue(`items.${index}.unitPrice`, product.defaultRate);
    setValue(`items.${index}.gstPercent`, product.gstPercent);
  };

  // The description box doubles as the product picker: an exact product-name match (picked from
  // the suggestions or typed) fills unit/rate/GST/HSN; anything else is kept as a custom line.
  const onDescriptionChange = (index, value) => {
    const product = products.find((p) => p.name.trim().toLowerCase() === value.trim().toLowerCase());
    setValue(`items.${index}.productId`, product ? String(product.id) : '');
    if (product) applyProduct(index, product.id);
  };

  const itemGridColumns = watchType === 'GST'
    ? '20px minmax(160px, 1fr) 64px 60px 80px 52px 52px 100px 28px'
    : '20px minmax(160px, 1fr) 64px 60px 80px 52px 100px 28px';

  const onInvalid = () => {
    toast.error('Every item needs a description, quantity, unit and rate — check the items marked in red');
  };

  const onSubmit = async (values) => {
    if (customerMode === 'existing' && !values.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (customerMode === 'new') {
      const c = values.customer;
      if (!c.name || !c.mobile || !c.address) {
        toast.error('Please fill in the new customer\'s name, mobile and address');
        return;
      }
    }

    const payload = {
      ...(customerMode === 'existing' ? { customerId: Number(values.customerId) } : { customer: values.customer }),
      quotationType: values.quotationType,
      remarks: values.remarks ? `Quotation for ${values.remarks}` : undefined,
      terms: values.terms,
      validityDays: Number(values.validityDays) || 7,
      items: values.items.map((item) => ({
        productId: item.productId ? Number(item.productId) : null,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent) || 0,
        gstPercent: values.quotationType === 'GST' ? Number(item.gstPercent) || 0 : 0,
      })),
    };

    try {
      if (isEdit) {
        await quotationsApi.updateQuotation(editId, payload);
        toast.success('Quotation updated');
        navigate(`/quotations/${editId}`);
      } else {
        const res = await quotationsApi.createQuotation(payload);
        localStorage.removeItem(DRAFT_KEY);
        toast.success('Quotation created');
        navigate(`/quotations/${res.data.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} quotation`);
    }
  };

  return (
    <Layout>
      <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Quotations &gt; {isEdit ? `Edit ${editNumber || 'Quotation'}` : 'Create Quotation'}</p>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/quotations/${editId}` : '/quotations')}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-navy-900"
            title={isEdit ? 'Back to quotation' : 'Back to quotations (your typing is saved as a draft)'}
          >
            <ArrowLeft size={17} />
          </button>
          <h1 className="text-2xl font-bold text-navy-900">{isEdit ? `Edit Quotation ${editNumber}` : 'Create Quotation'}</h1>
        </div>
        {!isEdit && (
          <button
            type="button"
            className="text-xs text-red-500 hover:underline"
            onClick={() => { localStorage.removeItem(DRAFT_KEY); reset(); setCustomerMode('new'); toast.success('Form cleared'); }}
          >
            Clear form & draft
          </button>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        // Enter in a field no longer saves a half-filled quotation (textareas still get new lines)
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}
        // Scrolling the page over a number box must not silently change it (e.g. GST 18 → 17.98)
        onWheel={(e) => { if (e.target.type === 'number' && document.activeElement === e.target) e.target.blur(); }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        <div className="space-y-6 lg:col-span-3 min-w-0">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy-900">Customer Details</h3>
              <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${customerMode === 'new' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}
                >
                  New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${customerMode === 'existing' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Existing Customer
                </button>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <div>
                <Label>Select Customer</Label>
                <Select {...register('customerId')}>
                  <option value="">Select existing customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} &middot; {c.mobile}</option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input {...register('customer.name')} placeholder="Enter client name" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input {...register('customer.mobile')} placeholder="+91 00000 00000" />
                  </div>
                  <div>
                    <Label>Email (Optional)</Label>
                    <Input type="email" {...register('customer.email')} placeholder="client@example.com" />
                  </div>
                </div>
                <div>
                  <Label>Project Address</Label>
                  <Textarea rows={2} {...register('customer.address')} placeholder="Suite, Street, Landmark..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>GST Number (Optional)</Label>
                    <Input {...register('customer.gstNumber')} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <Label>Customer Type</Label>
                    <Select {...register('customer.customerType')}>
                      <option value="Individual">Individual</option>
                      <option value="Company">Company</option>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  If this mobile number already matches an existing customer, that customer's record will be reused instead of creating a duplicate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <Label>Quotation Type</Label>
                <Select {...register('quotationType')}>
                  <option value="GST">GST</option>
                  <option value="NonGST">Non GST</option>
                </Select>
              </div>
              <div>
                <Label>Validity (days)</Label>
                <Input type="number" {...register('validityDays')} />
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy-900">Quotation Items</h3>
              <Button type="button" variant="outline" onClick={() => append(emptyItem)}>
                <Plus size={15} /> Add Item
              </Button>
            </div>

            {/* Typing suggests matching products; picking one fills unit, rate & GST. Anything else is a custom line. */}
            <datalist id="quotation-product-options">
              {products.map((p) => (
                <option key={p.id} value={p.name}>{`₹${p.defaultRate} / ${p.unit}`}</option>
              ))}
            </datalist>

            <div className="overflow-x-auto -mx-1 px-1">
              <div className="min-w-[640px]">
                <div className="grid gap-2 px-1 pb-2 text-[11px] font-semibold uppercase text-gray-400 border-b border-gray-100" style={{ gridTemplateColumns: itemGridColumns }}>
                  <span>#</span>
                  <span>Item / Description *</span>
                  <span>Qty *</span>
                  <span>Unit</span>
                  <span>Rate ₹ *</span>
                  <span>Disc %</span>
                  {watchType === 'GST' && <span>GST %</span>}
                  <span className="text-right">Amount</span>
                  <span />
                </div>

                {fields.map((field, index) => {
                  const line = watchItems?.[index] || {};
                  const lineAmount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) * (1 - (Number(line.discountPercent) || 0) / 100);
                  const itemErrors = errors.items?.[index];
                  const descField = register(`items.${index}.description`, { required: true });
                  return (
                    <div
                      key={field.id}
                      className={`grid gap-2 items-center px-1 py-2 border-b border-gray-50 ${itemErrors ? 'bg-red-50/40' : ''}`}
                      style={{ gridTemplateColumns: itemGridColumns }}
                    >
                      <span className="text-xs font-semibold text-gray-400">{index + 1}</span>
                      <input
                        {...descField}
                        onChange={(e) => { descField.onChange(e); onDescriptionChange(index, e.target.value); }}
                        list="quotation-product-options"
                        placeholder="Type or pick a product…"
                        title="Start typing to pick from Products, or type any custom description"
                        className={cellInput(itemErrors?.description)}
                      />
                      <input type="number" step="0.01" {...register(`items.${index}.quantity`, { required: true, min: 0.01 })} className={cellInput(itemErrors?.quantity)} />
                      <input {...register(`items.${index}.unit`, { required: true })} placeholder="sqft" className={cellInput(itemErrors?.unit)} />
                      <input type="number" step="0.01" {...register(`items.${index}.unitPrice`, { required: true, min: 0 })} placeholder="0.00" className={cellInput(itemErrors?.unitPrice)} />
                      <input type="number" step="0.01" {...register(`items.${index}.discountPercent`)} className={cellInput()} />
                      {watchType === 'GST' && (
                        <input type="number" step="0.01" {...register(`items.${index}.gstPercent`)} className={cellInput()} />
                      )}
                      <span className="text-sm font-semibold text-navy-900 text-right tabular-nums">{formatCurrency(lineAmount)}</span>
                      {fields.length > 1 ? (
                        <button
                          type="button"
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 justify-self-center"
                          title="Remove this item"
                          onClick={() => remove(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : <span />}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full justify-center mt-4" onClick={() => append(emptyItem)}>
              <Plus size={15} /> Add Item
            </Button>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-navy-900 mb-4">Subject &amp; Note</h3>
            <div className="space-y-4">
              <div>
                <Label>Subject (printed after "SUB:" — you fill the work type)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">Quotation for</span>
                  <Input {...register('remarks')} placeholder="Curtains & Mosquito net" />
                </div>
              </div>
              <div>
                <Label>Note (printed after "Note :" — leave blank for the default validity/advance text)</Label>
                <Textarea rows={2} {...register('terms')} placeholder="e.g. All prices quoted are valid for 28 days from the date of stated on the quotation. 70% advance for the order confirmation." />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <div className="bg-gray-100 rounded-t-xl p-4 max-h-[72vh] overflow-y-auto">
              <QuotationPreviewCard
                company={settings}
                customer={selectedCustomer}
                quotationType={watchType}
                items={watchItems || []}
                subtotal={totals.subtotal}
                discountAmount={totals.discountAmount}
                total={totals.total}
                remarks={watch('remarks') ? `Quotation for ${watch('remarks')}` : ''}
                terms={watch('terms')}
                validityDays={watch('validityDays')}
              />
            </div>
            {isInterState && (
              <p className="bg-amber-50 border-x border-gray-200 text-amber-700 text-xs px-4 py-2">Inter-state — IGST applies</p>
            )}
            <div className="bg-white border border-gray-200 rounded-b-xl p-4">
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between"><span className="text-gray-500">Gross Total</span><span>{formatCurrency(totals.subtotal)}</span></div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatCurrency(totals.discountAmount)}</span></div>
                )}
                {watchType === 'GST' && groupByGstRatePreview(watchItems || []).map((g) => (
                  <div key={g.rate} className="flex justify-between"><span className="text-gray-500">GST {g.rate} %</span><span>{formatCurrency(g.taxAmount)}</span></div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="font-bold text-navy-900">Grand Total</span>
                  <span className="font-bold text-lg text-navy-900">{formatCurrency(totals.total)}</span>
                </div>
              </div>
              <Button type="submit" variant="accent" className="w-full justify-center" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Quotation'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}
