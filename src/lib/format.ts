/** Indian-notation currency formatting for budget bands (₹40k, ₹1.5L, ₹2.5Cr). */
export function formatInr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "₹0";
  if (amount >= 10_000_000) return `₹${trim(amount / 10_000_000)}Cr`;
  if (amount >= 100_000) return `₹${trim(amount / 100_000)}L`;
  if (amount >= 1_000) return `₹${trim(amount / 1_000)}k`;
  return `₹${Math.round(amount)}`;
}

function trim(value: number): string {
  return value
    .toFixed(1)
    .replace(/\.0$/, "");
}

/** A budget band, shown as a range rather than false precision. */
export function formatBudgetRange(min: number, max: number): string {
  if (!min && !max) return "Estimate on consultation";
  if (min === max) return formatInr(max);
  return `${formatInr(min)} – ${formatInr(max)}`;
}
