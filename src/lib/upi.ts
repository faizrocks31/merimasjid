/**
 * UPI (Unified Payments Interface) identifier helpers.
 *
 * A UPI ID is `handle@bank` where the handle is either a 10-digit mobile
 * number or a name of 2-64 characters starting with a letter or digit,
 * and the suffix is the PSP or bank's handle. NPCI keeps adding banks,
 * so an unknown suffix is *flagged* rather than rejected — a hard reject
 * would block valid IDs for newly launched banks.
 */

/** Bank / PSP handles that commonly appear after the "@" in a UPI ID. */
const UPI_HANDLES = new Set([
  // Wallets and generic PSPs
  "upi", "ybl", "paytm", "okaxis", "oksbank", "ibl", "axl", "yapl", "apl",
  "epay", "getnf", "payzap", "amazonpay", "upiapp", "upipr", "aplst",
  // Banks
  "okhdfcbank", "oksicici", "hsbc", "federal", "kotak", "icici", "sbi",
  "axisbank", "axis", "hdfcbank", "sbiup", "indus", "yesbank", "iblcorp",
  "cnrb", "idib", "kotakb", "bankofbaroda", "canara", "pnb", "ubi",
  "unionbank", "indianbank", "centralbank", "karnataka", "federalbank",
  "uco", "iob", "csb", "tmb", "rbl", "yes", "aubank", "jupiter", "slice",
]);

/** `handle@bank` — no spaces, no consecutive separators. Handle is 10-digit mobile or 2-64 char name. */
export const UPI_ID_PATTERN = /^(?:\d{10}|[a-z0-9][a-z0-9._\-]{1,63})@[\w.\-]+$/;

/**
 * The handle (left of the "@"): a 10-digit mobile number, or a name of
 * 2-64 characters starting with a letter or digit.
 */
export const UPI_HANDLE_PATTERN = /^(?:\d{10}|[a-z0-9][a-z0-9._\-]{1,63})$/;

/** True when the suffix after "@" is a handle we recognise. */
export function isKnownUpiHandle(suffix: string): boolean {
  return UPI_HANDLES.has(suffix.trim().toLowerCase());
}

/** The part after "@", or an empty string when there is no "@". */
export function upiBankHandle(value: string): string {
  const at = value.lastIndexOf("@");
  return at === -1 ? "" : value.slice(at + 1).trim().toLowerCase();
}