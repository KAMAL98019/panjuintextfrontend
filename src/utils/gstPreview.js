const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Client-side mirror of the backend gstCalculator, used only for the live preview panel. */
export function calculateTotalsPreview({ items, quotationType, isInterState }) {
  let subtotal = 0;
  let discountAmount = 0;
  let gstAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unitPrice) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const gstPct = Number(item.gstPercent) || 0;

    const lineBase = qty * rate;
    const lineDiscount = lineBase * (discPct / 100);
    const taxable = lineBase - lineDiscount;

    let lineGst = 0;
    if (quotationType === 'GST') {
      lineGst = taxable * (gstPct / 100);
      if (isInterState) igst += lineGst;
      else { cgst += lineGst / 2; sgst += lineGst / 2; }
    }

    subtotal += lineBase;
    discountAmount += lineDiscount;
    gstAmount += lineGst;
  });

  const total = quotationType === 'GST' ? subtotal - discountAmount + gstAmount : subtotal - discountAmount;

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    gstAmount: round2(gstAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    total: round2(total),
  };
}

/** Client-side mirror of the backend's groupByGstRate — "GST 5%: X" / "GST 18%: Y" as separate lines. */
export function groupByGstRatePreview(items) {
  const groups = new Map();
  items.forEach((item) => {
    const rate = Number(item.gstPercent) || 0;
    if (rate <= 0) return;
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const taxableValue = qty * unitPrice * (1 - discPct / 100);
    const taxAmount = taxableValue * (rate / 100);
    const existing = groups.get(rate) || { rate, taxableValue: 0, taxAmount: 0 };
    existing.taxableValue += taxableValue;
    existing.taxAmount += taxAmount;
    groups.set(rate, existing);
  });

  return Array.from(groups.values())
    .sort((a, b) => a.rate - b.rate)
    .map((g) => ({ ...g, taxableValue: round2(g.taxableValue), taxAmount: round2(g.taxAmount) }));
}
