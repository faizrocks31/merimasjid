/**
 * Money helpers. All amounts are stored and computed as integer paise.
 * Never use floating point for money anywhere in this codebase.
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paise as ₹1,23,456.00 */
export function formatPaise(paise: number): string {
  return INR.format(paise / 100);
}

/** Format paise without the currency symbol, e.g. 1,23,456.00 */
export function formatPaisePlain(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Alias for formatPaisePlain - used in new UI */
export function formatINR(paise: number): string {
  return formatPaisePlain(paise);
}

/** Convert paise to a plain rupee string suitable for a form input. */
export function paiseToInput(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Parse a user-entered rupee string ("1,250.50") into integer paise. Returns null if invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise)) return null;
  return paise;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

/** Indian numbering system: crore / lakh / thousand. */
export function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  const parts: string[] = [];

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rest = num % 100;

  if (crore) parts.push(`${numberToWordsIndian(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return parts.join(" ");
}

/** Amount in words, e.g. "Rupees One Thousand Two Hundred Fifty Only" */
export function paiseToWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  let out = `Rupees ${numberToWordsIndian(rupees)}`;
  if (p > 0) out += ` and ${twoDigits(p)} Paise`;
  return `${out} Only`;
}
