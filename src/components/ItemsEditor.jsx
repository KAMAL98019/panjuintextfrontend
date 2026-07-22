import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from './Button';
import { Label } from './form/Field';
import { formatCurrency } from '../utils/format';

export const emptyItemFor = (mode) =>
  mode === 'memo'
    ? { description: '', shadeCode: '', quantity: 1, unit: 'sqft', unitPrice: '', gstPercent: 0 }
    : mode === 'gst'
    ? { description: '', hsnCode: '', quantity: 1, unit: 'sqft', unitPrice: '', discountPercent: 0, gstPercent: 18 }
    : { description: '', hsnCode: '', quantity: 1, unit: 'sqft', unitPrice: '', discountPercent: 0 };

export function lineAmountFor(mode, item) {
  const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  const taxable = base * (1 - (Number(item.discountPercent) || 0) / 100);
  if (mode === 'gst') return taxable * (1 + (Number(item.gstPercent) || 0) / 100);
  // Memo: flat by default, but GST can optionally be added per line
  if (mode === 'memo') return base * (1 + (Number(item.gstPercent) || 0) / 100);
  return taxable;
}

/**
 * Editable product/price-list table shared by the Memo bill, GST bill, and Quotation "Revise
 * Amount" forms — matching the physical pads where Description/Shade Code (or HSN)/Qty/Rate are
 * blank lines for hand-filling, fully re-editable rather than frozen from wherever the items
 * originally came from.
 */
function MiniField({ label, className = '', children }) {
  return (
    <div className={className}>
      <span className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</span>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded px-2 py-1 text-xs';

export default function ItemsEditor({ items, onChange, mode }) {
  const updateItem = (index, field, value) => {
    onChange(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addItem = () => onChange([...items, emptyItemFor(mode)]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  const showGstFields = mode === 'gst' || mode === 'memo'; // optional on memos, defaults to 0
  const gstLabel = mode === 'memo' ? 'GST % (optional)' : 'GST %';
  const showDiscount = mode === 'gst' || mode === 'nongst';
  const codeField = mode === 'memo' ? 'shadeCode' : 'hsnCode';
  const codeLabel = mode === 'memo' ? 'Shade Code' : 'HSN Code';

  const total = items.reduce((sum, item) => sum + lineAmountFor(mode, item), 0);
  const amountSpan = 12 - 4 - (showDiscount ? 2 : 0) - (showGstFields ? 2 : 0);

  return (
    <div>
      <div className="mb-2">
        <Label>Items</Label>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.map((item, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-2.5">
            <div className="grid grid-cols-12 gap-1.5 mb-1.5">
              <MiniField label="Description" className="col-span-12 sm:col-span-6">
                <input className={inputCls} placeholder="e.g. Hall Zebra Blinds" value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)} />
              </MiniField>
              <MiniField label={codeLabel} className="col-span-6 sm:col-span-3">
                <input className={inputCls} value={item[codeField] || ''}
                  onChange={(e) => updateItem(index, codeField, e.target.value)} />
              </MiniField>
              <MiniField label="Unit" className="col-span-4 sm:col-span-2">
                <input className={inputCls} placeholder="sqft" value={item.unit}
                  onChange={(e) => updateItem(index, 'unit', e.target.value)} />
              </MiniField>
              <button type="button" onClick={() => removeItem(index)} title="Remove item"
                className="col-span-2 sm:col-span-1 text-red-400 hover:text-red-600 flex items-end justify-center pb-1.5">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-12 gap-1.5 items-end">
              <MiniField label="Qty" className="col-span-4 sm:col-span-2">
                <input type="number" step="0.01" className={inputCls} value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
              </MiniField>
              <MiniField label="Rate ₹" className="col-span-4 sm:col-span-2">
                <input type="number" step="0.01" className={inputCls} value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
              </MiniField>
              {showDiscount && (
                <MiniField label="Disc %" className="col-span-4 sm:col-span-2">
                  <input type="number" step="0.01" className={inputCls} value={item.discountPercent}
                    onChange={(e) => updateItem(index, 'discountPercent', e.target.value)} />
                </MiniField>
              )}
              {showGstFields && (
                <MiniField label={gstLabel} className="col-span-4 sm:col-span-2">
                  <input type="number" step="0.01" className={inputCls} value={item.gstPercent ?? 0}
                    onChange={(e) => updateItem(index, 'gstPercent', e.target.value)} />
                </MiniField>
              )}
              {(() => {
                const spanClasses = {
                  4: 'sm:col-span-4',
                  6: 'sm:col-span-6',
                  8: 'sm:col-span-8',
                };
                const spanClass = spanClasses[amountSpan] || 'sm:col-span-4';
                return (
                  <div className={`text-right col-span-12 ${spanClass}`}>
                    <span className="block text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Amount</span>
                    <span className="text-xs font-semibold">{formatCurrency(lineAmountFor(mode, item))}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No items yet — click "Add Item" to start from scratch.</p>}
      </div>
      <Button type="button" variant="outline" className="w-full justify-center mt-2" onClick={addItem}>
        <Plus size={13} /> Add Item
      </Button>
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
        <span className="text-sm font-bold text-navy-900">Total</span>
        <span className="text-sm font-bold text-navy-900">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
