import { describe, expect, it } from "vitest";
import { formatPaise, numberToWordsIndian, paiseToInput, paiseToWords, parseRupeesToPaise } from "@/lib/money";

describe("money", () => {
  it("parses plain and formatted rupee input into integer paise (whole rupees only)", () => {
    expect(parseRupeesToPaise("500")).toBe(50000);
    expect(parseRupeesToPaise("500.5")).toBeNull(); // decimals rejected
    expect(parseRupeesToPaise("1,250")).toBe(125000);
    expect(parseRupeesToPaise("₹ 1,250")).toBe(125000);
  });

  it("rejects malformed and decimal input", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise("12.345")).toBeNull();
    expect(parseRupeesToPaise("12.34")).toBeNull(); // decimals rejected
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("-10")).toBeNull();
    expect(parseRupeesToPaise("1e5")).toBeNull();
  });

  it("never loses precision on round-trip conversion", () => {
    for (const rupees of ["0", "1", "10", "999999", "12345678"]) {
      const paise = parseRupeesToPaise(rupees)!;
      expect(paiseToInput(paise)).toBe(Number(rupees).toString());
    }
  });

  it("formats paise as Indian rupees (whole rupees only)", () => {
    expect(formatPaise(125000)).toContain("1,250");
    expect(formatPaise(0)).toContain("0");
  });

  it("writes amounts in Indian numbering", () => {
    expect(numberToWordsIndian(0)).toBe("Zero");
    expect(numberToWordsIndian(15)).toBe("Fifteen");
    expect(numberToWordsIndian(105)).toBe("One Hundred Five");
    expect(numberToWordsIndian(100000)).toBe("One Lakh");
    expect(numberToWordsIndian(12345678)).toBe("One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight");
    expect(paiseToWords(125000)).toBe("Rupees One Thousand Two Hundred Fifty Only");
  });
});
