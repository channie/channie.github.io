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
 * last word boundary that fits, drops any trailing punctuation left
 * dangling by the cut, and ends with an ellipsis — so the result reads as
 * a deliberate summary rather than a string that ran out of room.
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

  return `${cut.replace(/[\s,;:.!?—–-]+$/, '')}…`;
}
