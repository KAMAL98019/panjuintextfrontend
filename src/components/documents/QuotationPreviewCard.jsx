import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { groupByGstRatePreview } from '../../utils/gstPreview';
import { formatDate } from '../../utils/format';
import { effectiveQty, isLumpSum } from '../../utils/lumpSum';

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

const cellBorder = (compact) => `border border-gray-400 px-1 ${compact ? 'py-0 leading-tight' : 'py-[3px]'}`;
const TABLE_W = 340;
const BODY_W = 415;
const QT_RIGHT = 488; // right edge of the QT number/date block (pt), as in quotationPdf.js
const QT_WIDTH = 120;

/**
 * Live preview of the quotation on the real printed letterhead — mirrors quotationPdf.js:
 * text always stays the normal size; when the items don't fit on one sheet the rows tighten up
 * first, and if they still don't fit they continue on a second sheet (the last row always travels
 * with the totals/note/footer, so a sheet never holds only the footer). Rows are measured in a
 * hidden copy, then laid out at true A4 size and CSS-scaled to the container width.
 */
export default function QuotationPreviewCard({ company, customer, quotationNumber, date, quotationType, items, subtotal, discountAmount, total, remarks, terms, validityDays }) {
  const isGst = quotationType === 'GST';
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [layout, setLayout] = useState({ compact: false, breaks: [] });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setScale(entries[0].contentRect.width / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const taxableAmount = (item) => {
    const base = effectiveQty(item) * (Number(item.unitPrice) || 0);
    return base * (1 - (Number(item.discountPercent) || 0) / 100);
  };

  const grossTotal = items.reduce((sum, item) => sum + taxableAmount(item), 0);
  const gstGroups = isGst ? groupByGstRatePreview(items) : [];

  // Lay out pages from the hidden measuring copy. Runs after every render on purpose (any item or
  // text change can change heights); it only sets state when the layout actually changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m) return;
    const h = (sel) => m.querySelector(sel)?.offsetHeight || 0;
    const rowHeights = (mode) => Array.from(m.querySelectorAll(`[data-row="${mode}"]`)).map((el) => el.offsetHeight);
    const headH = h('[data-head]');
    const room1 = ZONE_H - headH;

    const fits = (mode) => rowHeights(mode).reduce((s, x) => s + x, 0) + h(`[data-tail="${mode}"]`) <= room1;
    let next;
    if (fits('normal')) next = { compact: false, breaks: [] };
    else if (fits('compact')) next = { compact: true, breaks: [] };
    else {
      // Normal spacing across sheets: fill each sheet, then carry the last row over with the tail
      const breaks = [];
      let used = 0;
      let room = room1;
      rowHeights('normal').forEach((rh, idx) => {
        if (used + rh > room && idx > 0) { breaks.push(idx); used = 0; room = ZONE_H; }
        used += rh;
      });
      const tailH = h('[data-tail="normal"]');
      if (used + tailH > room && items.length > 0 && !breaks.includes(items.length - 1)) breaks.push(items.length - 1);
      next = { compact: false, breaks };
    }
    if (next.compact !== layout.compact || next.breaks.join() !== layout.breaks.join()) setLayout(next);
  });

  const head = (
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
      </div>

      <p className="text-[9px] mb-2"><span className="font-bold">SUB:</span>  {remarks || 'Quotation for interior furnishing works'}</p>

      <p className="text-[9px] font-bold">DEAR SIR</p>
      <p className="text-[8.5px] text-gray-700 ml-4 mb-2">
        We are very much delighted by your kind enquiry and very happy to present you the quotation for the service you have enquired. Anticipating for your support and positive response.
      </p>

      <p className="text-[9.5px] font-bold underline mb-1">Quotation Area :</p>
    </>
  );

  const itemRow = (item, idx, compact, mode) => {
    const c = cellBorder(compact);
    return (
      <tr key={idx} data-row={mode}>
        <td className={c} style={{ width: '36%' }}>{item.description || '(untitled item)'}</td>
        <td className={`${c} text-right`} style={{ width: '11%' }}>{isLumpSum(item) ? '' : item.quantity}</td>
        <td className={`${c} text-center`} style={{ width: '11%' }}>{isLumpSum(item) ? '' : item.unit || ''}</td>
        <td className={`${c} text-right`} style={{ width: '16%' }}>{money(item.unitPrice, false)}</td>
        <td className={`${c} text-center`} style={{ width: '4%' }}>=</td>
        <td className={`${c} text-right`} style={{ width: '22%' }}>{money(taxableAmount(item))}</td>
      </tr>
    );
  };

  const totalsRows = (compact) => {
    const c = cellBorder(compact);
    return (
      <>
        <tr>
          <td colSpan={4} className={`${c} text-center font-bold text-navy-900`}>Gross Total</td>
          <td className={`${c} text-center`}>=</td>
          <td className={`${c} text-right font-bold text-navy-900`}>{money(subtotal ?? grossTotal)}</td>
        </tr>
        {discountAmount > 0 && (
          <tr>
            <td colSpan={4} className={`${c} text-center`}>Discount</td>
            <td className={`${c} text-center`}>=</td>
            <td className={`${c} text-right`}>- {money(discountAmount)}</td>
          </tr>
        )}
        {gstGroups.map((g) => (
          <tr key={g.rate}>
            <td colSpan={4} className={`${c} text-center`}>GST {g.rate} %</td>
            <td className={`${c} text-center`}>=</td>
            <td className={`${c} text-right`}>{money(g.taxAmount)}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={4} className={`${c} text-center font-bold text-navy-900`}>Grand Total</td>
          <td className={`${c} text-center`}>=</td>
          <td className={`${c} text-right font-bold text-navy-900`}>{money(total)}</td>
        </tr>
      </>
    );
  };

  const noteAndFooter = (
    <>
      <p className="text-[8.5px] mb-3">
        <span className="font-bold">Note : </span>
        <span className="text-gray-700">
          {terms || `All prices quoted are valid for ${validityDays || 7} days from the date of stated on the quotation. 70% advance for the order confirmation.`}
        </span>
      </p>

      <div className="flex justify-between items-end pt-4 text-[9px]">
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
  );

  const tableCls = 'border-collapse text-[8.5px] mb-2 font-bold';
  const tableStyle = { tableLayout: 'fixed', width: TABLE_W };

  // Split item indexes into sheets at the planned breaks
  const sheets = [];
  let start = 0;
  [...layout.breaks, items.length].forEach((end) => { sheets.push(items.slice(start, end).map((item, i) => [item, start + i])); start = end; });

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {scale > 0 && sheets.map((sheetItems, sheetIdx) => {
        const isFirst = sheetIdx === 0;
        const isLast = sheetIdx === sheets.length - 1;
        return (
          <div key={sheetIdx} className="relative w-full overflow-hidden shadow-lg" style={{ aspectRatio: `${A4_W} / ${A4_H}` }}>
            <div
              className="absolute top-0 left-0 bg-white text-black"
              style={{
                width: A4_W, height: A4_H,
                transform: `scale(${scale})`, transformOrigin: 'top left',
                backgroundImage: "url('/images/letterhead-a4.png')", backgroundSize: '100% 100%',
              }}
            >
              <div className="absolute overflow-hidden" style={{ left: 45, top: ZONE_TOP, width: BODY_W, bottom: ZONE_BOTTOM }}>
                {isFirst && head}
                <table className={tableCls} style={tableStyle}>
                  <tbody>
                    {sheetItems.map(([item, idx]) => itemRow(item, idx, layout.compact))}
                    {isLast && totalsRows(layout.compact)}
                  </tbody>
                </table>
                {isLast && noteAndFooter}
              </div>
              {/* QT number + date at the top-right, just inside the header curve — same spot as the PDF */}
              {isFirst && (
                <div className="absolute text-[9px] leading-snug text-right" style={{ left: QT_RIGHT - QT_WIDTH, width: QT_WIDTH, top: ZONE_TOP + 32 }}>
                  <span className="font-bold">{quotationNumber || 'Draft'}</span>
                  <br />{formatDate(date || new Date())}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Hidden measuring copy (same widths/fonts) — offsetHeight is unaffected by the sheet scaling */}
      <div style={{ height: 0, overflow: 'hidden' }} aria-hidden>
      <div ref={measureRef} className="pointer-events-none" style={{ visibility: 'hidden', width: BODY_W }}>
        <div data-head>{head}</div>
        {['normal', 'compact'].map((mode) => (
          <div key={mode}>
            <table className={tableCls} style={tableStyle}><tbody>{items.map((item, idx) => itemRow(item, idx, mode === 'compact', mode))}</tbody></table>
            <div data-tail={mode}>
              <table className={tableCls} style={tableStyle}><tbody>{totalsRows(mode === 'compact')}</tbody></table>
              {noteAndFooter}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
