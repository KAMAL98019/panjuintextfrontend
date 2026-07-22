import React, { useEffect, useRef, useState } from 'react';
import { groupByGstRatePreview } from '../../utils/gstPreview';
import { formatDate } from '../../utils/format';

const A4_W = 595.28; // pt — same coordinate system as the PDF renderer
const A4_H = 841.89;
const ZONE_TOP = 116;
const ZONE_BOTTOM = 92;
const ZONE_H = A4_H - ZONE_TOP - ZONE_BOTTOM;

const money = (n, decimals = true) => {
  const num = Number(n || 0);
  const sign = num < 0 ? '- ' : '';
  return `${sign}Rs. ${Math.abs(num).toLocaleString('en-IN', decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 })}`;
};

const cellBorder = 'border border-gray-400 px-1 py-[3px]';

// Rough per-row height estimate so items can be split across sheets like the PDF does.
const rowHeight = (item) => {
  const lines = Math.max(1, Math.ceil((item.description || '(untitled item)').length / 27));
  return lines * 11 + 8;
};

/**
 * Live preview of the quotation on the real printed letterhead — mirrors quotationPdf.js,
 * including pagination: when items overflow the sheet's content zone, they continue on a
 * second letterhead sheet exactly like the generated PDF. Each sheet is laid out at true
 * A4 size and CSS-scaled to the container width.
 */
export default function QuotationPreviewCard({ company, customer, quotationNumber, date, quotationType, items, subtotal, discountAmount, total, remarks, terms, validityDays }) {
  const isGst = quotationType === 'GST';
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setScale(entries[0].contentRect.width / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const taxableAmount = (item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return base * (1 - (Number(item.discountPercent) || 0) / 100);
  };

  const grossTotal = items.reduce((sum, item) => sum + taxableAmount(item), 0);
  const gstGroups = isGst ? groupByGstRatePreview(items) : [];
  const gstFromItems = gstGroups.reduce((sum, g) => sum + g.taxAmount, 0);
  const computedGrand = (subtotal ?? grossTotal) - (discountAmount || 0) + gstFromItems;
  const negotiatedDiff = total !== undefined && total !== null ? computedGrand - Number(total) : 0;

  // ----- Paginate: header block on sheet 1, items flow across sheets, totals/note/footer at the end
  const headerH = 207;
  const totalsRowCount = 2 + gstGroups.length + (discountAmount > 0 ? 1 : 0) + (Math.abs(negotiatedDiff) > 0.5 ? 1 : 0);
  const tailH = totalsRowCount * 17 + 40 + 95; // totals rows + note + footer block

  const sheets = [];
  let current = { items: [], first: sheets.length === 0 };
  let used = headerH;
  items.forEach((item) => {
    const h = rowHeight(item);
    if (used + h > ZONE_H && current.items.length > 0) {
      sheets.push(current);
      current = { items: [], first: false };
      used = 10;
    }
    current.items.push(item);
    used += h;
  });
  current.tail = true;
  if (used + tailH > ZONE_H && current.items.length > 0) {
    sheets.push({ ...current, tail: false });
    current = { items: [], first: false, tail: true };
  }
  sheets.push(current);

  let sr = 0; // running index so row keys stay stable across sheets

  const renderItemsRows = (sheetItems) =>
    sheetItems.map((item) => {
      sr += 1;
      return (
        <tr key={sr}>
          <td className={cellBorder} style={{ width: '36%' }}>{item.description || '(untitled item)'}</td>
          <td className={`${cellBorder} text-right`} style={{ width: '11%' }}>{item.quantity || 0}</td>
          <td className={`${cellBorder} text-center`} style={{ width: '11%' }}>{item.unit || ''}</td>
          <td className={`${cellBorder} text-right`} style={{ width: '16%' }}>{money(item.unitPrice, false)}</td>
          <td className={`${cellBorder} text-center`} style={{ width: '4%' }}>=</td>
          <td className={`${cellBorder} text-right`} style={{ width: '22%' }}>{money(taxableAmount(item))}</td>
        </tr>
      );
    });

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {scale > 0 && sheets.map((sheet, idx) => (
        <div key={idx} className="relative w-full overflow-hidden shadow-lg" style={{ aspectRatio: `${A4_W} / ${A4_H}` }}>
          <div
            className="absolute top-0 left-0 bg-white text-black"
            style={{
              width: A4_W, height: A4_H,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              backgroundImage: "url('/images/letterhead-a4.png')", backgroundSize: '100% 100%',
            }}
          >
            <div className="absolute overflow-hidden" style={{ left: 45, top: ZONE_TOP, width: 415, bottom: ZONE_BOTTOM }}>
              {sheet.first && (
                <>
                  <div className="flex justify-between items-start mb-3" style={{ marginTop: 32 }}>
                    <div className="text-[9px] leading-snug flex gap-2">
                      <span className="font-bold">TO:</span>
                      <span>
                        <span className="font-bold">{customer?.name || 'Customer name'}</span>
                        {customer?.address && <><br />{customer.address}</>}
                        {customer?.city && <><br />{customer.city}{customer.pincode ? ` - ${customer.pincode}` : ''}</>}
                        {customer?.mobile && <><br />ph.no: {customer.mobile}</>}
                      </span>
                    </div>
                    <div className="text-[9px] leading-snug text-left shrink-0">
                      <span className="font-bold">{quotationNumber || 'Draft'}</span>
                      <br />{formatDate(date || new Date())}
                    </div>
                  </div>

                  <p className="text-[9px] mb-2"><span className="font-bold">SUB:</span>  {remarks || 'Quotation for interior furnishing works'}</p>

                  <p className="text-[9px] font-bold">DEAR SIR</p>
                  <p className="text-[8.5px] text-gray-700 ml-4 mb-2">
                    We are very much delighted by your kind enquiry and very happy to present you the quotation for the service you have enquired. Anticipating for your support and positive response.
                  </p>

                  <p className="text-[9.5px] font-bold underline mb-1">Quotation Area :</p>
                </>
              )}

              <table className="border-collapse text-[8.5px] mb-2 font-bold" style={{ tableLayout: 'fixed', width: 340 }}>
                <tbody>
                  {renderItemsRows(sheet.items)}
                  {sheet.tail && (
                    <>
                      <tr>
                        <td colSpan={4} className={`${cellBorder} text-center font-bold text-navy-900`}>Gross Total</td>
                        <td className={`${cellBorder} text-center`}>=</td>
                        <td className={`${cellBorder} text-right font-bold text-navy-900`}>{money(subtotal ?? grossTotal)}</td>
                      </tr>
                      {discountAmount > 0 && (
                        <tr>
                          <td colSpan={4} className={`${cellBorder} text-center`}>Discount</td>
                          <td className={`${cellBorder} text-center`}>=</td>
                          <td className={`${cellBorder} text-right`}>- {money(discountAmount)}</td>
                        </tr>
                      )}
                      {gstGroups.map((g) => (
                        <tr key={g.rate}>
                          <td colSpan={4} className={`${cellBorder} text-center`}>GST {g.rate} %</td>
                          <td className={`${cellBorder} text-center`}>=</td>
                          <td className={`${cellBorder} text-right`}>{money(g.taxAmount)}</td>
                        </tr>
                      ))}
                      {Math.abs(negotiatedDiff) > 0.5 && (
                        <tr>
                          <td colSpan={4} className={`${cellBorder} text-center`}>{negotiatedDiff > 0 ? 'Special Discount' : 'Adjustment'}</td>
                          <td className={`${cellBorder} text-center`}>=</td>
                          <td className={`${cellBorder} text-right`}>{money(-negotiatedDiff)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={4} className={`${cellBorder} text-center font-bold text-navy-900`}>Grand Total</td>
                        <td className={`${cellBorder} text-center`}>=</td>
                        <td className={`${cellBorder} text-right font-bold text-navy-900`}>{money(total)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {sheet.tail && (
                <>
                  <p className="text-[8.5px] mb-3">
                    <span className="font-bold">Note : </span>
                    <span className="text-gray-700">
                      {terms || `All prices quoted are valid for ${validityDays || 7} days from the date of stated on the quotation. 70% advance for the order confirmation.`}
                    </span>
                  </p>

                  <div className="flex justify-between items-end mt-4 text-[9px]">
                    <div className="leading-relaxed font-bold">
                      {company?.name?.toUpperCase() || 'PANJU INTEXT'}
                      <br />A/c. No : 510101000385645
                      <br />UNION BANK of INDIA
                      <br />IFSC : UBIN 0817767
                      <br />FIVE ROADS - SALEM BRANCH
                    </div>
                    <div className="text-center">
                      <span className="font-bold">Thanks &amp; Regards</span>
                      <br /><span className="text-gray-700">{company?.name || 'Panju Intext'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
