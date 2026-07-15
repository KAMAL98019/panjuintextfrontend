import React, { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../utils/format';

const A4_W = 595.28;
const A4_H = 841.89;
// Same pixel→point mapping as backend/src/pdf/memoBillPdf.js (artwork is 1086x1449)
const X = (px) => (px * A4_W) / 1086;
const Y = (px) => (px * A4_H) / 1449;

const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const At = ({ x, y, w, align = 'left', bold, color, size = 9.5, children }) => (
  <span
    className="absolute leading-none"
    style={{
      left: X(x), top: Y(y), width: w ? X(w) : undefined,
      textAlign: align, fontWeight: bold ? 700 : 400,
      color: color || '#000', fontSize: size, whiteSpace: 'nowrap', overflow: 'hidden',
    }}
  >
    {children}
  </span>
);

/**
 * Live preview printed onto the exact scanned MEMO pad artwork — mirrors memoBillPdf.js
 * value-for-value and coordinate-for-coordinate. Scales to its container like a PDF page.
 */
export default function MemoPreviewCard({ billNumber, date, name, cell, address, items = [], total, advance, balance, materialsDeliveryDate, jobExecutionPeriod, remarks }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setScale(entries[0].contentRect.width / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lineAmount = (item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 + (Number(item.gstPercent) || 0) / 100);
  const computedTotal = total ?? items.reduce((s, i) => s + lineAmount(i), 0);
  const paid = Number(advance) || 0;
  const pending = balance ?? Math.max(computedTotal - paid, 0);

  const cleanNumber = (billNumber || '').replace(/^(MEMO|INV|GST)(?:-DEMO)?-/i, '');

  const bodyTopPx = 465;
  const rowHpx = 25; // ≈14.5pt rows in artwork pixels

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden shadow-lg" style={{ aspectRatio: `${A4_W} / ${A4_H}` }}>
      {scale > 0 && (
        <div
          className="absolute top-0 left-0"
          style={{
            width: A4_W, height: A4_H,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            backgroundImage: "url('/images/memo-pad-a4.png')", backgroundSize: '100% 100%',
          }}
        >
          {/* mask the pad's preprinted serial number */}
          <div className="absolute" style={{ left: X(150), top: Y(248), width: X(200), height: Y(52), background: '#fbf7e5' }} />

          <At x={155} y={262} bold color="#2e3192" size={10}>{cleanNumber || (billNumber ? '' : '(auto number)')}</At>
          <At x={790} y={258}>{formatDate(date || new Date())}</At>

          <At x={190} y={325} w={480}>{name}</At>
          <At x={760} y={325} w={250}>{cell}</At>
          <At x={210} y={373} w={800}>{String(address || '').replace(/\n/g, ', ')}</At>

          {items.map((item, idx) => {
            const y = bodyTopPx + idx * rowHpx;
            if (y > 1030) return null;
            return (
              <React.Fragment key={idx}>
                <At x={68} y={y} w={60} align="center" size={9}>{idx + 1}</At>
                <At x={132} y={y} w={396} size={9}>{item.description}</At>
                <At x={533} y={y} w={149} align="center" size={9}>{item.shadeCode || ''}</At>
                <At x={682} y={y} w={74} align="center" size={9}>{item.quantity}</At>
                <At x={760} y={y} w={94} align="right" size={9}>{money(item.unitPrice)}</At>
                <At x={858} y={y} w={158} align="right" size={9}>{money(lineAmount(item))}</At>
              </React.Fragment>
            );
          })}

          <At x={330} y={1078}>{materialsDeliveryDate ? formatDate(materialsDeliveryDate) : ''}</At>
          <At x={330} y={1123}>{jobExecutionPeriod}</At>
          <At x={330} y={1168} w={290}>{remarks}</At>

          <At x={830} y={1078} w={185} align="right" bold color="#2e3192" size={10}>Rs. {money(computedTotal)}</At>
          <At x={830} y={1123} w={185} align="right">Rs. {money(paid)}</At>
          <At x={830} y={1168} w={185} align="right">Rs. {money(pending)}</At>
        </div>
      )}
    </div>
  );
}
