import type { PriceItem } from "./types";
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
/** Exact (case-insensitive) match on name or SKU. */
export function findPrice(book: PriceItem[], text: string): PriceItem | undefined {
  const n = norm(text);
  if (!n) return undefined;
  return book.find((p) => norm(p.name) === n || (p.sku && norm(p.sku) === n));
}
