import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { calculateTotalsPreview } from '../../utils/gstPreview';
import { formatCurrency } from '../../utils/format';

const emptyItem = { description: '', hsnCode: '', quantity: 1, unit: 'sqft', unitPrice: '', discountPercent: 0, gstPercent: 18, productId: '' };

// Unsaved typing on this form is kept in localStorage so navigating away (back button,
// accidental link click, refresh) never loses an in-progress quotation.
const DRAFT_KEY = 'panjuintext_quotation_draft';

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

  const { register, control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({
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
      if (['Confirmed', 'Cancelled'].includes(q.status)) {
        toast.error(`Cannot edit a ${q.status} quotation`);
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

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
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

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="mb-2">
                    <Label>Select Item — auto-fills rate, HSN & GST from Product Master</Label>
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: f }) => (
                        <Select {...f} onChange={(e) => { f.onChange(e); applyProduct(index, e.target.value); }}>
                          <option value="">Type a custom line manually...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      )}
                    />
                  </div>

                  <div className="mb-2">
                    <Label>Description (e.g. "Hall Zebra Blinds", "Bed Room Zebra Blinds")</Label>
                    <Input {...register(`items.${index}.description`, { required: true })} />
                  </div>

                  <div className="grid grid-cols-6 gap-2 items-end">
                    <div>
                      <Label>HSN</Label>
                      <Input {...register(`items.${index}.hsnCode`)} />
                    </div>
                    <div>
                      <Label>Qty</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.quantity`, { required: true, min: 0.01 })} />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input {...register(`items.${index}.unit`, { required: true })} />
                    </div>
                    <div>
                      <Label>Rate</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.unitPrice`, { required: true, min: 0 })} />
                    </div>
                    <div>
                      <Label>Disc %</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.discountPercent`)} />
                    </div>
                    {watchType === 'GST' && (
                      <div>
                        <Label>GST %</Label>
                        <Input type="number" step="0.01" {...register(`items.${index}.gstPercent`)} />
                      </div>
                    )}
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-red-500 mt-2"
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={13} /> Remove item
                    </button>
                  )}
                </div>
              ))}
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

        <div>
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
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-navy-900">Total</span>
                <span className="font-bold text-lg text-navy-900">{formatCurrency(totals.total)}</span>
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
