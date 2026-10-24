import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { groupByGstRatePreview } from '../../utils/gstPreview';
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

/** Pad-style date: 21.10.2026 */
const dotDate = (date) => {
  const d = new Date(date || Date.now());
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

/** "Quotation for Wallpaper & Blinds reg." with the work type in bold, like the pad. */
const subjectLine = (text) => {
  const m = text.match(/^(Quotation for\s+)(.+?)(\s+reg\.?)?$/i);
  if (!m) return text;
  return <>{m[1]}<span className="font-bold">{m[2]}</span>{m[3] || ''}</>;
};

const cellBorder = (compact) => `border border-gray-400 px-1 ${compact ? 'py-0 leading-tight' : 'py-[3px]'}`;
const TABLE_W = 340;
const BODY_W = 415;
const QT_RIGHT = 488; // right edge of the QT number/date block (pt), as in quotationPdf.js
const QT_WIDTH = 120;

/**
 * Live preview of the quotation on the real printed letterhead — mirrors quotationPdf.js, which
 * always produces ONE page: normal layout when it fits; otherwise Excel-like tight rows and
 * tighter gaps in the top section (text keeps its size); only when a sheet is physically full do
 * the table + note shrink, just enough to fit. Heights are measured in a hidden copy, then the
 * sheet is laid out at true A4 size and CSS-scaled to the container width.
 */
export default function QuotationPreviewCard({ company, customer, quotationNumber, date, quotationType, items, subtotal, discountAmount, total, remarks, terms, validityDays }) {
  const isGst = quotationType === 'GST';
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [scale, setScale] = useState(0);
  const [layout, setLayout] = useState({ compactHead: false, compactRows: false, fit: 1, bodyH: 0 });

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

  // Pick the layout from the hidden measuring copy. Runs after every render on purpose (any item or
  // text change can change heights); it only sets state when the layout actually changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m) return;
    const h = (sel) => m.querySelector(sel)?.offsetHeight || 0;
    // Room for the table + note: the content zone minus the top section and the (fixed) footer
    const room = (mode) => ZONE_H - h(`[data-head="${mode}"]`) - h('[data-foot]');
    const body = (mode) => h(`[data-body="${mode}"]`);

    // Same order as the PDF: tight rows first, then tighter top-section gaps, then (last resort) shrink
    let next;
    if (body('normal') <= room('normal')) next = { compactHead: false, compactRows: false, fit: 1, bodyH: body('normal') };
    else if (body('compact') <= room('normal')) next = { compactHead: false, compactRows: true, fit: 1, bodyH: body('compact') };
    else if (body('compact') <= room('compact')) next = { compactHead: true, compactRows: true, fit: 1, bodyH: body('compact') };
    else next = { compactHead: true, compactRows: true, fit: Math.max(0.1, room('compact') / body('compact')), bodyH: body('compact') };

    if (next.compactHead !== layout.compactHead || next.compactRows !== layout.compactRows
      || Math.abs(next.fit - layout.fit) > 0.005 || Math.abs(next.bodyH - layout.bodyH) > 0.5) {
      setLayout(next);
    }
  });

  const head = (compact) => (
    <>
      {/* Like the pad: "TO:" on its own line, the customer's name/address indented below it */}
      <div className={`text-[9px] leading-snug ${compact ? 'mb-1' : 'mb-4'}`} style={{ marginTop: compact ? 14 : 32 }}>
        <p className="font-bold">TO:</p>
        <p className="font-bold mt-[5px]" style={{ marginLeft: 32 }}>{customer?.name || 'Customer name'}</p>
        <p style={{ marginLeft: 32 }}>
          {customer?.address}
          {customer?.city && <><br />{customer.city}{customer.pincode ? ` - ${customer.pincode}` : ''}</>}
          {customer?.mobile && <><br />ph.no: {customer.mobile}</>}
        </p>
      </div>

      <p className={`text-[9px] ${compact ? 'mb-1' : 'mb-2'}`}><span className="font-bold">SUB:</span>  {subjectLine(remarks || 'Quotation for interior furnishing works')}</p>

      <p className="text-[9px] font-bold">DEAR SIR</p>
      <p className={`text-[8.5px] text-gray-700 ml-4 ${compact ? 'mb-1' : 'mb-2'}`}>
        We are very much delighted by your kind enquiry and very happy to present you the quotation for the service you have enquired. Anticipating for your support and positive response.
      </p>

      <p className="text-[9.5px] font-bold underline mb-1">Quotation Area :</p>
    </>
  );

  // Column names heading the table, like the PDF
  const headerRow = (compact, mode) => {
    const c = `${cellBorder(compact)} bg-[#e8ecf5] text-navy-900`;
    return (
      <tr data-hdr={mode}>
        <td className={c} style={{ width: '36%' }}>Description</td>
        <td className={`${c} text-center`} style={{ width: '11%' }}>Qty</td>
        <td className={`${c} text-center`} style={{ width: '11%' }}>Unit</td>
        <td className={`${c} text-center`} style={{ width: '16%' }}>Rate</td>
        <td className={c} style={{ width: '4%' }} />
        <td className={`${c} text-right`} style={{ width: '22%' }}>Amount</td>
      </tr>
    );
  };

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

  const note = (
    <p className="text-[8.5px] mb-3">
      <span className="font-bold">Note : </span>
      <span className="text-gray-700">
        {terms || `All prices quoted are valid for ${validityDays || 7} days from the date of stated on the quotation. 70% advance for the order confirmation.`}
      </span>
    </p>
  );

  const footer = (
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
  );

  /** Table (header, items, totals) + note — the part that tightens / shrinks to fit. */
  const tableBody = (compact) => (
    <>
      <table className={tableCls} style={tableStyle}>
        <tbody>
          {headerRow(compact)}
          {items.map((item, idx) => itemRow(item, idx, compact))}
          {totalsRows(compact)}
        </tbody>
      </table>
      {note}
    </>
  );

  const tableCls = 'border-collapse text-[8.5px] mb-2 font-bold';
  const tableStyle = { tableLayout: 'fixed', width: TABLE_W };

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {scale > 0 && (
        <div className="relative w-full overflow-hidden shadow-lg" style={{ aspectRatio: `${A4_W} / ${A4_H}` }}>
          <div
            className="absolute top-0 left-0 bg-white text-black"
            style={{
              width: A4_W, height: A4_H,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              backgroundImage: "url('/images/letterhead-a4.png')", backgroundSize: '100% 100%',
            }}
          >
            <div className="absolute overflow-hidden" style={{ left: 45, top: ZONE_TOP, width: BODY_W, bottom: ZONE_BOTTOM }}>
              {head(layout.compactHead)}
              {/* Last resort only: table + note scaled to fit; the wrapper keeps the scaled height */}
              <div style={{ height: layout.fit < 1 && layout.bodyH ? layout.bodyH * layout.fit : undefined }}>
                <div style={layout.fit < 1 ? { width: BODY_W / layout.fit, transform: `scale(${layout.fit})`, transformOrigin: 'top left' } : undefined}>
                  {tableBody(layout.compactRows)}
                </div>
              </div>
              {footer}
            </div>
            {/* QT number + date at the top-right, just inside the header curve — same spot as the PDF */}
            <div className="absolute text-[9px] leading-snug text-center" style={{ left: QT_RIGHT - QT_WIDTH, width: QT_WIDTH, top: ZONE_TOP + (layout.compactHead ? 14 : 32) }}>
              <span className="font-bold">{quotationNumber || 'Draft'}</span>
              <br />{dotDate(date)}
            </div>
          </div>
        </div>
      )}

      {/* Hidden measuring copy (same widths/fonts) — offsetHeight is unaffected by the sheet scaling */}
      <div style={{ height: 0, overflow: 'hidden' }} aria-hidden>
      <div ref={measureRef} className="pointer-events-none" style={{ visibility: 'hidden', width: BODY_W }}>
        {['normal', 'compact'].map((mode) => (
          <div key={mode}>
            <div data-head={mode}>{head(mode === 'compact')}</div>
            <div data-body={mode}>{tableBody(mode === 'compact')}</div>
          </div>
        ))}
        <div data-foot>{footer}</div>
      </div>
      </div>
    </div>
  );
}
