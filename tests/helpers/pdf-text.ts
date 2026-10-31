import zlib from "node:zlib";

/**
 * Pulls the visible text out of a pdf-lib document.
 *
 * The receipt embeds NotoSans as a subset, so glyphs are written as hex codes
 * rather than literal characters. The font's ToUnicode CMap maps those codes
 * back to characters, which is what a reader actually sees. Tests use this to
 * assert receipt content (numbers, the ₹ sign, the duplicate marker).
 */
export function extractPdfText(pdf: Buffer): string {
  const chunks: Buffer[] = [];
  let i = 0;
  while (true) {
    const s = pdf.indexOf("stream", i);
    if (s === -1) break;
    let start = s + 6;
    if (pdf[start] === 13) start++;
    if (pdf[start] === 10) start++;
    const e = pdf.indexOf("endstream", start);
    if (e === -1) break;
    try {
      chunks.push(zlib.inflateSync(pdf.subarray(start, e)));
    } catch {
      // Not a Flate stream (image or XObject) — nothing to read.
    }
    i = e + 9;
  }

  const cmap = new Map<number, string>();
  for (const chunk of chunks) {
    const text = chunk.toString("latin1");
    if (!text.includes("beginbfchar") && !text.includes("beginbfrange")) continue;
    for (const m of text.matchAll(/<([0-9A-Fa-f]{4,})>\s*<([0-9A-Fa-f]{4,})>/g)) {
      cmap.set(parseInt(m[1], 16), decodeUtf16Be(m[2]));
    }
  }

  const out: string[] = [];
  for (const chunk of chunks) {
    const text = chunk.toString("latin1");
    if (!/Tj/.test(text) || text.includes("beginbfchar")) continue;
    for (const m of text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      out.push(decodeHex(m[1], cmap));
    }
  }
  return out.join("\n");
}

function decodeHex(hex: string, cmap: Map<number, string>): string {
  let s = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    s += cmap.get(parseInt(hex.slice(i, i + 4), 16)) ?? "";
  }
  return s;
}

/** UTF-16BE hex; surrogate pairs combine automatically in a JS string. */
function decodeUtf16Be(hex: string): string {
  let s = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return s;
}
