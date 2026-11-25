import { describe, expect, it } from "vitest";
import { formatPaise, numberToWordsIndian, paiseToInput, paiseToWords, parseRupeesToPaise } from "@/lib/money";

describe("money", () => {
  it("parses plain and formatted rupee input into integer paise", () => {
    expect(parseRupeesToPaise("500")).toBe(50000);
    expect(parseRupeesToPaise("500.5")).toBe(50050);
    expect(parseRupeesToPaise("1,250.05")).toBe(125005);
    expect(parseRupeesToPaise("₹ 1,250.05")).toBe(125005);
  });

  it("rejects malformed and over-precise input instead of rounding", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise("12.345")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("-10")).toBeNull();
    expect(parseRupeesToPaise("1e5")).toBeNull();
  });

  it("never loses precision on round-trip conversion", () => {
    for (const rupees of ["0.01", "0.10", "1.00", "999999.99", "12345678.90"]) {
      const paise = parseRupeesToPaise(rupees)!;
      expect(paiseToInput(paise)).toBe(Number(rupees).toFixed(2));
    }
  });

  it("formats paise as Indian rupees", () => {
    expect(formatPaise(125005)).toContain("1,250.05");
    expect(formatPaise(0)).toContain("0.00");
  });

  it("writes amounts in Indian numbering", () => {
    expect(numberToWordsIndian(0)).toBe("Zero");
    expect(numberToWordsIndian(15)).toBe("Fifteen");
    expect(numberToWordsIndian(105)).toBe("One Hundred Five");
    expect(numberToWordsIndian(100000)).toBe("One Lakh");
    expect(numberToWordsIndian(12345678)).toBe("One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight");
    expect(paiseToWords(125050)).toBe("Rupees One Thousand Two Hundred Fifty and Fifty Paise Only");
  });
});
