import { describe, expect, it } from "vitest";
import { formatBudgetRange, formatInr } from "@/lib/format";

describe("formatInr", () => {
  it("formats plain rupees below a thousand", () => {
    expect(formatInr(500)).toBe("₹500");
  });

  it("formats thousands with a k suffix", () => {
    expect(formatInr(40_000)).toBe("₹40k");
  });

  it("formats lakhs with an L suffix", () => {
    expect(formatInr(150_000)).toBe("₹1.5L");
  });

  it("formats crores with a Cr suffix", () => {
    expect(formatInr(25_000_000)).toBe("₹2.5Cr");
  });

  it("trims a trailing .0", () => {
    expect(formatInr(200_000)).toBe("₹2L");
  });

  it("returns ₹0 for zero and negatives rather than a broken string", () => {
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(-100)).toBe("₹0");
  });

  it("returns ₹0 for NaN rather than '₹NaN'", () => {
    expect(formatInr(Number.NaN)).toBe("₹0");
  });
});

describe("formatBudgetRange", () => {
  it("renders a range", () => {
    expect(formatBudgetRange(40_000, 150_000)).toBe("₹40k – ₹1.5L");
  });

  it("collapses an equal min and max to a single figure", () => {
    expect(formatBudgetRange(20_000, 20_000)).toBe("₹20k");
  });

  it("falls back to a consultation prompt when there is no estimate", () => {
    expect(formatBudgetRange(0, 0)).toBe("Estimate on consultation");
  });
});
