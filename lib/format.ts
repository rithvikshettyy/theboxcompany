/**
 * Indian number formatting (CLAUDE.md §4 rule 6): ₹ before the number with no space, lakh and
 * crore groupings, and a real minus sign.
 */
const MINUS = "−";
const LAKH = 1e5;
const CRORE = 1e7;

const grouped = (value: number, decimals: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** ₹ amount split for display: the unit can be set smaller than the figure. */
export type InrParts = { sign: "" | "+" | typeof MINUS; amount: string; unit: "" | "L" | "Cr" };

export function inrParts(value: number, signed = false): InrParts {
  const abs = Math.abs(value);
  const sign = value < 0 && abs >= 0.5 ? MINUS : signed ? "+" : "";
  const lakhs = Math.round((abs / LAKH) * 100) / 100;
  if (lakhs >= 100) return { sign, amount: grouped(Math.round((abs / CRORE) * 100) / 100, 2), unit: "Cr" };
  if (lakhs >= 1) return { sign, amount: lakhs.toFixed(2), unit: "L" };
  return { sign, amount: grouped(Math.round(abs), 0), unit: "" };
}

/** inr(698000) → "₹6.98 L", inr(18400000) → "₹1.84 Cr", inr(84500) → "₹84,500". */
export function inr(value: number): string {
  const { sign, amount, unit } = inrParts(value);
  return `${sign}₹${amount}${unit ? ` ${unit}` : ""}`;
}

/** Always carries a sign: "+₹5.84 L", "−₹12,400", "+₹0". */
export function inrSigned(value: number): string {
  const { sign, amount, unit } = inrParts(value, true);
  return `${sign}₹${amount}${unit ? ` ${unit}` : ""}`;
}

/** num(223327) → "2,23,327". */
export function num(value: number, decimals = 0): string {
  const text = grouped(Math.abs(value), decimals);
  return value < 0 && text !== grouped(0, decimals) ? `${MINUS}${text}` : text;
}

/** pct(61.43) → "61.4%". Takes a value already in percent. */
export function pct(value: number, decimals = 1): string {
  return `${num(value, decimals)}%`;
}

/** k(5200) → "5.2k". Compact counts for tight labels. */
export function k(value: number): string {
  if (Math.abs(value) < 1000) return num(value);
  const text = (value / 1000).toFixed(1).replace(/\.0$/, "");
  return `${text.replace("-", MINUS)}k`;
}
