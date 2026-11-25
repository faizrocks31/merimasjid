/**
 * Helper functions for the collection form
 */

let keyCounter = 0;
const nextKey = () => `a${++keyCounter}`;

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}