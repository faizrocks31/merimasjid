/**
 * Hindi number to words converter using Indian numbering system.
 * Handles numbers up to crores with proper Hindi words for 1-99.
 * Uses Devanagari script for output.
 */

// Hindi words for 0-19
const HINDI_ONES: Record<number, string> = {
  0: "शून्य",
  1: "एक",
  2: "दो",
  3: "तीन",
  4: "चार",
  5: "पाँच",
  6: "छह",
  7: "सात",
  8: "आठ",
  9: "नौ",
  10: "दस",
  11: "ग्यारह",
  12: "बारह",
  13: "तेरह",
  14: "चौदह",
  15: "पंद्रह",
  16: "सोलह",
  17: "सत्रह",
  18: "अठारह",
  19: "उन्नीस",
};

// Hindi words for tens (20, 30, 40, ... 90)
const HINDI_TENS: Record<number, string> = {
  20: "बीस",
  30: "तीस",
  40: "चालीस",
  50: "पचास",
  60: "साठ",
  70: "सत्तर",
  80: "अस्सी",
  90: "नब्बे",
};

// Special Hindi words for 21-99 (irregular forms)
const HINDI_SPECIAL: Record<number, string> = {
  21: "इक्कीस",
  22: "बाईस",
  23: "तेईस",
  24: "चौबीस",
  25: "पच्चीस",
  26: "छब्बीस",
  27: "सत्ताईस",
  28: "अट्ठाईस",
  29: "उनतीस",
  31: "इकतीस",
  32: "बत्तीस",
  33: "तैंतीस",
  34: "चौंतीस",
  35: "पैंतीस",
  36: "छत्तीस",
  37: "सैंतीस",
  38: "अड़तीस",
  39: "उनतालीस",
  41: "इकतालीस",
  42: "बयालीस",
  43: "तैंतालीस",
  44: "चवालीस",
  45: "पैंतालीस",
  46: "छियालीस",
  47: "सैंतालीस",
  48: "अड़तालीस",
  49: "उनचास",
  51: "इक्यावन",
  52: "बावन",
  53: "तिरपन",
  54: "चौवन",
  55: "पचपन",
  56: "छप्पन",
  57: "सत्तावन",
  58: "अट्ठावन",
  59: "उनसठ",
  61: "इकसठ",
  62: "बासठ",
  63: "तिरसठ",
  64: "चौंसठ",
  65: "पैंसठ",
  66: "छियासठ",
  67: "सड़सठ",
  68: "अड़सठ",
  69: "उनहत्तर",
  71: "इकहत्तर",
  72: "बहत्तर",
  73: "तिहत्तर",
  74: "चौहत्तर",
  75: "पचहत्तर",
  76: "छिहत्तर",
  77: "सतहत्तर",
  78: "अठहत्तर",
  79: "उनासी",
  81: "इक्यासी",
  82: "बयासी",
  83: "तिरासी",
  84: "चौरासी",
  85: "पचासी",
  86: "छियासी",
  87: "सत्तासी",
  88: "अट्ठासी",
  89: "नवासी",
  91: "इक्यानवे",
  92: "बानवे",
  93: "तिरानवे",
  94: "चौरानवे",
  95: "पचानवे",
  96: "छियानवे",
  97: "सत्तानवे",
  98: "अट्ठानवे",
  99: "निन्यानवे",
};

/**
 * Convert a number 1-99 to Hindi words
 */
function twoDigitsHindi(n: number): string {
  if (n <= 19) return HINDI_ONES[n];
  if (HINDI_SPECIAL[n]) return HINDI_SPECIAL[n];
  // Regular tens + ones (e.g., 30 -> तीस, 31 -> इकतीस handled above)
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return HINDI_TENS[tens] + (ones ? " " + HINDI_ONES[ones] : "");
}

/**
 * Convert any positive integer to Hindi words using Indian numbering system
 * (हज़ार, लाख, करोड़)
 */
export function numberToHindiWords(num: number): string {
  if (num === 0) return HINDI_ONES[0];

  const parts: string[] = [];

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rest = num % 100;

  if (crore) {
    parts.push(`${numberToHindiWords(crore)} करोड़`);
  }
  if (lakh) {
    parts.push(`${twoDigitsHindi(lakh)} लाख`);
  }
  if (thousand) {
    parts.push(`${twoDigitsHindi(thousand)} हज़ार`);
  }
  if (hundred) {
    parts.push(`${HINDI_ONES[hundred]} सौ`);
  }
  if (rest) {
    parts.push(twoDigitsHindi(rest));
  }

  return parts.join(" ");
}

/**
 * Convert amount in paise to Hindi words with "रुपये मात्र" suffix
 * e.g., 500000 -> "पाँच लाख रुपये मात्र"
 *       12500000 -> "एक करोड़ पच्चीस लाख रुपये मात्र"
 *       50100 -> "पाँच सौ एक रुपये मात्र"
 */
export function paiseToHindiWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;

  if (rupees === 0 && p === 0) {
    return "शून्य रुपये मात्र";
  }

  let out = `${numberToHindiWords(rupees)} रुपये`;

  if (p > 0) {
    out += ` ${twoDigitsHindi(p)} पैसे`;
  }

  return `${out} मात्र`;
}

/**
 * Format number with Indian comma grouping (1,23,456)
 */
export function formatIndianNumber(num: number): string {
  return num.toLocaleString("en-IN");
}

export { HINDI_ONES, HINDI_TENS, HINDI_SPECIAL };