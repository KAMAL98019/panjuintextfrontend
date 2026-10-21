/**
 * Lump-sum lines (e.g. "Transport", "Fixing charges"): the Qty box is left blank and the Rate is
 * the line's whole amount. They are saved as quantity 1 with no unit, and shown everywhere with
 * blank Qty/Unit — so no extra column or database field is needed and every total stays correct.
 */
export const isBlankQty = (quantity) => quantity === '' || quantity === null || quantity === undefined;

/** Quantity used for amounts while editing: a blank Qty counts once. */
export const effectiveQty = (item) => (isBlankQty(item.quantity) ? 1 : Number(item.quantity) || 0);

/** True for a line that should show blank Qty/Unit (blank while editing, or saved as 1 with no unit). */
export const isLumpSum = (item) =>
  isBlankQty(item.quantity) || (Number(item.quantity) === 1 && !String(item.unit || '').trim());

/** Qty value to put back into a form when editing a saved line (lump sums come back blank). */
export const formQty = (item) => (isLumpSum(item) ? '' : item.quantity);

/** Unit value to put back into a form when editing a saved line. */
export const formUnit = (item) => (isLumpSum(item) ? '' : item.unit);

/** Quantity + unit to send to the API for a form line. */
export const savedQtyUnit = (item) =>
  isBlankQty(item.quantity)
    ? { quantity: 1, unit: '' }
    : { quantity: Number(item.quantity), unit: item.unit || '' };
