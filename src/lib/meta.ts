/* ============================================================
   meta.ts — helpers for <head> metadata.

   Page descriptions are authored for humans: a post's `excerpt` is shown
   in full on the listing page, and the podcast description comes from the
   RSS feed. Those run long, and the SAME string feeds both
   `<meta name="description">` and `og:description`, so an over-long one is
   cut by search engines and by link previews — mid-word, mid-sentence.

   So the trim happens here, in the <head> only. The visible text on the
   page is never touched.
   ============================================================ */

/** Search engines show ~155–160 characters; link previews are similar.
    One value feeds both, so this is the safe common ceiling. */
export const DESCRIPTION_MAX = 160;

/**
 * Trim a description for `<head>` without cutting a word in half.
 *
 * Returns the text unchanged when it already fits. Otherwise cuts at the
 * last word boundary that fits, backs out of a quotation the cut would
 * leave open, drops any trailing punctuation left dangling by the cut,
 * and ends with an ellipsis — so the result reads as a deliberate summary
 * rather than a string that ran out of room.
 */
export function truncateDescription(text: string, max: number = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  // Leave room for the ellipsis.
  const room = max - 1;
  const slice = clean.slice(0, room);

  // If the next character is whitespace, the slice already ends on a whole
  // word — backing off to the previous space would drop a word for nothing.
  const endsOnWord = /\s/.test(clean.charAt(room));
  const lastSpace = slice.lastIndexOf(' ');
  const cut = endsOnWord || lastSpace <= 0 ? slice : slice.slice(0, lastSpace);
  const closed = withoutOpenQuote(cut);

  return `${(closed.trim() ? closed : cut).replace(/[\s,;:.!?—–-]+$/, '')}…`;
}

/**
 * Cut back to just before a quotation the text opens but never closes.
 * Otherwise a preview can end on `and “show…`: a dangling quote mark, and
 * the quoted words orphaned from their closing half. Curly quotes are
 * matched by direction; straight double quotes by count. (A ’ inside an
 * open ‘…’ quotation reads as its close; rare enough not to matter here.)
 */
function withoutOpenQuote(text: string): string {
  for (const [open, close] of [['“', '”'], ['‘', '’']]) {
    const at = text.lastIndexOf(open);
    if (at !== -1 && text.indexOf(close, at) === -1) return text.slice(0, at);
  }
  if ((text.match(/"/g) ?? []).length % 2 === 1) return text.slice(0, text.lastIndexOf('"'));
  return text;
}
