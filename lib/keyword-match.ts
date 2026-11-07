/**
 * Pick the value whose keyword is the longest case-insensitive substring of `text`
 * ("pineapple" beats "apple", "watermelon" beats "water"). Ties go to the earlier rule.
 */
export function longestKeywordMatch<T>(text: string, rules: [string[], T][]): T | null {
  const t = text.toLowerCase();
  let best: { len: number; value: T } | null = null;
  for (const [words, value] of rules) {
    for (const w of words) {
      if (t.includes(w) && (!best || w.length > best.len)) best = { len: w.length, value };
    }
  }
  return best?.value ?? null;
}
