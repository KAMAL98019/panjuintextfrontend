import React, { useEffect, useRef, useState } from 'react';
import { calculateTotalsPreview } from '../../utils/gstPreview';
import { formatDate, amountToIndianWords } from '../../utils/format';

const A4_W = 595.28;
const A4_H = 841.89;
// Same pixel→point mapping as backend/src/pdf/gstBillPdf.js (artwork is 1086x1449)
const X = (px) => (px * A4_W) / 1086;
const Y = (px) => (px * A4_H) / 1449;

const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rsPs(n) {
  const num = Number(n || 0);
  const rs = Math.floor(num);
  const ps = Math.round((num - rs) * 100);
  return [rs.toLocaleString('en-IN'), String(ps).padStart(2, '0')];
}

const At = ({ x, y, w, align = 'left', bold, color, size = 9.5, italic, children }) => (
  <span
    className="absolute leading-none"
    style={{
      left: X(x), top: Y(y), width: w ? X(w) : undefined,
      textAlign: align, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal',
      color: color || '#000', fontSize: size, whiteSpace: 'nowrap', overflow: 'hidden',
    }}
  >
    {children}
  </span>
);

/**
 * Live preview printed onto the exact scanned "Tax Invoice Cash / Credit" pad artwork —
 * mirrors gstBillPdf.js value-for-value. Scales to its container like a PDF page.
 */
export default function GstBillPreviewCard({ company, customer, billNumber, date, items = [], placeOfSupply, dateOfSupply, modeOfTransport, vehicleNo, transporterName }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setScale(entries[0].contentRect.width / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isInterState = !!(company?.state && customer?.state && company.state.trim().toLowerCase() !== customer.state.trim().toLowerCase());
  const totals = calculateTotalsPreview({ items, quotationType: 'GST', isInterState });
  const rates = [...new Set(items.map((i) => Number(i.gstPercent) || 0).filter((r) => r > 0))];
  const halfRate = rates.length === 1 ? `${rates[0] / 2}` : '';
  const fullRate = rates.length === 1 ? `${rates[0]}` : '';

  const taxable = (item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return base * (1 - (Number(item.discountPercent) || 0) / 100);
  };

  const bodyTopPx = 592;
  const rowHpx = 25;

  const cleanNumber = (billNumber || '').replace(/^(MEMO|INV|GST)(?:-DEMO)?-/i, '');

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden shadow-lg" style={{ aspectRatio: `${A4_W} / ${A4_H}` }}>
      {scale > 0 && (
        <div
          className="absolute top-0 left-0"
          style={{
            width: A4_W, height: A4_H,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            backgroundImage: "url('/images/gst-pad-a4.png')", backgroundSize: '100% 100%',
          }}
        >



          <At x={172} y={270} bold color="#2e3192" size={10}>{cleanNumber || (billNumber ? '' : '(auto number)')}</At>
          <At x={830} y={270}>{formatDate(date || new Date())}</At>

          <At x={85} y={325} w={470}>{customer?.name}</At>
          <At x={35} y={368} w={520}>{String(customer?.address || '').replace(/\n/g, ', ')}</At>
          <At x={205} y={450} w={345}>{customer?.mobile}</At>
          <At x={215} y={497} w={335}>{customer?.gstNumber}</At>

          <At x={770} y={325} w={280}>{placeOfSupply || customer?.state || ''}</At>
          <At x={770} y={368} w={280}>{modeOfTransport}</At>
          <At x={770} y={412} w={280}>{dateOfSupply ? formatDate(dateOfSupply) : ''}</At>
          <At x={770} y={455} w={280}>{vehicleNo}</At>
          <At x={770} y={500} w={280}>{transporterName}</At>

          {items.map((item, idx) => {
            const y = bodyTopPx + idx * rowHpx;
            if (y > 1030) return null;
            const [rs, ps] = rsPs(taxable(item));
            return (
              <React.Fragment key={idx}>
                <At x={5} y={y} w={45} align="center" size={9}>{idx + 1}</At>
                <At x={50} y={y} w={100} align="center" size={9}>{item.hsnCode || ''}</At>
                <At x={153} y={y} w={505} size={9}>{item.description}</At>
                <At x={661} y={y} w={98} align="center" size={9}>{item.quantity}</At>
                <At x={759} y={y} w={131} align="right" size={9}>{money(item.unitPrice)}</At>
                <At x={896} y={y} w={131} align="right" size={9}>{rs}</At>
                <At x={1033} y={y} w={46} align="center" size={9}>{ps}</At>
              </React.Fragment>
            );
          })}

          <At x={180} y={1102} w={470} italic size={8.5}>{amountToIndianWords(Math.round(totals.total))}</At>

          {(() => {
            const [subRs, subPs] = rsPs(totals.subtotal - (totals.discountAmount || 0));
            const [totalRs, totalPs] = rsPs(totals.total);
            const [cgstRs, cgstPs] = rsPs(totals.cgst);
            const [sgstRs, sgstPs] = rsPs(totals.sgst);
            const [igstRs, igstPs] = rsPs(totals.igst);

            return (
              <>
                <At x={896} y={1088} w={131} align="right" bold size={9}>{subRs}</At>
                <At x={1033} y={1088} w={46} align="center" bold size={9}>{subPs}</At>

                {!isInterState && (
                  <>
                    {halfRate && <At x={790} y={1132} w={48} align="right" size={9}>{halfRate}</At>}
                    {halfRate && <At x={790} y={1176} w={48} align="right" size={9}>{halfRate}</At>}
                    <At x={896} y={1132} w={131} align="right" size={9}>{cgstRs}</At>
                    <At x={1033} y={1132} w={46} align="center" size={9}>{cgstPs}</At>
                    <At x={896} y={1176} w={131} align="right" size={9}>{sgstRs}</At>
                    <At x={1033} y={1176} w={46} align="center" size={9}>{sgstPs}</At>
                  </>
                )}
                {isInterState && (
                  <>
                    {fullRate && <At x={790} y={1219} w={48} align="right" size={9}>{fullRate}</At>}
                    <At x={896} y={1219} w={131} align="right" size={9}>{igstRs}</At>
                    <At x={1033} y={1219} w={46} align="center" size={9}>{igstPs}</At>
                  </>
                )}
                <At x={896} y={1263} w={131} align="right" bold size={9}>{totalRs}</At>
                <At x={1033} y={1263} w={46} align="center" bold size={9}>{totalPs}</At>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
