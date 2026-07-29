/* ============================================================
   readingFlip — pure helper for the Reading island.

   The spread is a fixed-height "book"; when a book has more entries than
   fit, the right page scrolls internally under a soft fade. scrollEdge()
   decides which edge(s) to fade from the scroll geometry, so the fade is
   shown only when there's actually more content that way. Kept pure and
   unit-tested (readingFlip.test.ts); the DOM glue stays in the .astro
   island, as the Reading carousel does today.
   ============================================================ */

/** Titles that end in a period mid-sentence — splitting after these would
    strand "Dr." on a line of its own. Extend as real content needs it. */
const TITLES = /(?:^|\s)(?:Mr|Mrs|Ms|Dr|Prof|St|Sr|Jr|vs|etc|e\.g|i\.e)\.$/i;

/** Split a short closing beat into its sentences, one per line — the
    Reading spread's centred `coda`. Splits after . ! ? (Latin, needing a
    following space) and after 。！？ (CJK, which needs none), but never
    after a title like "Dr.". Returns the whole text as one line when it
    holds no sentence break. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const latin = '.!?'.includes(ch) && (i + 1 >= text.length || /\s/.test(text[i + 1]));
    const cjk = '。！？'.includes(ch);
    if (!latin && !cjk) continue;
    const piece = text.slice(start, i + 1);
    if (latin && TITLES.test(piece)) continue; // "Dr." — not a sentence end
    out.push(piece.trim());
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

/** Split an authored passage into paragraphs. Content uses a YAML folded
    block (`text: >`), which joins a paragraph's own wrapped lines with
    spaces and leaves ONE newline where the author left a blank line — so
    any run of newlines is a paragraph break. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Split a line around an emphasised phrase, so the phrase can be wrapped
    while the text around it stays put. Returns [before, phrase, after] for
    the FIRST occurrence, or null when the line doesn't contain it (the
    caller then renders the line unchanged). */
export function splitEmphasis(
  text: string,
  phrase: string,
): [string, string, string] | null {
  if (!phrase) return null;
  const at = text.indexOf(phrase);
  if (at === -1) return null;
  return [text.slice(0, at), phrase, text.slice(at + phrase.length)];
}

export type Edge = 'none' | 'top' | 'bottom' | 'both';

/** Which edge(s) of a scroll container should fade.
    - 'none'  : content fits (nothing to scroll to)
    - 'bottom': at the top, more below
    - 'top'   : at the bottom, more above
    - 'both'  : more in both directions
    `pad` absorbs sub-pixel rounding at the extremes. */
export function scrollEdge(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  pad = 2,
): Edge {
  if (scrollHeight - clientHeight <= pad) return 'none';
  const atTop = scrollTop <= pad;
  const atBottom = scrollTop + clientHeight >= scrollHeight - pad;
  if (atTop) return 'bottom';
  if (atBottom) return 'top';
  return 'both';
}
