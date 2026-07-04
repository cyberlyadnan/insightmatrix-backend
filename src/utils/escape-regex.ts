/** Escape user input for safe use inside MongoDB `$regex` patterns. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
