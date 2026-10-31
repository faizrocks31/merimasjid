"use client";

import { useEffect } from "react";

/**
 * Opens the browser print dialog as soon as the duplicate copy has rendered.
 *
 * A reprint is printed from a dedicated `?duplicate=1&print=1` view, so the
 * sheet on paper is genuinely stamped DUPLICATE COPY rather than the original
 * being reprinted unmarked. The short delay lets webfonts settle so the sheet
 * does not print in a fallback face.
 */
export function AutoPrint() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
