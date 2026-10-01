import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX, truncateDescription } from './meta';

describe('truncateDescription', () => {
  it('leaves a short description exactly as written', () => {
    const s = 'A personal home for creative work and things I keep returning to.';
    expect(truncateDescription(s)).toBe(s);
  });

  it('leaves a description that is exactly at the limit', () => {
    const s = 'x'.repeat(DESCRIPTION_MAX);
    expect(truncateDescription(s)).toBe(s);
  });

  it('never returns more than the limit', () => {
    const s = 'word '.repeat(200);
    expect(truncateDescription(s).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('cuts on a word boundary rather than mid-word', () => {
    const out = truncateDescription('alpha bravo charlie delta echo', 20);
    expect(out).toBe('alpha bravo charlie…');
    expect(out).not.toMatch(/charli…/);
  });

  it('drops punctuation left dangling by the cut', () => {
    expect(truncateDescription('one, two, three, four', 12)).toBe('one, two…');
  });

  it('collapses newlines and runs of whitespace', () => {
    expect(truncateDescription('one\n\ntwo   three')).toBe('one two three');
  });

  it('falls back to a hard cut when there is no space to break on', () => {
    const out = truncateDescription('a'.repeat(300), 10);
    expect(out).toBe(`${'a'.repeat(9)}…`);
    expect(out.length).toBe(10);
  });

  it('handles the real over-long descriptions the audit found', () => {
    const ski =
      'At twenty-something I tried skiing once, in rented pants and fashionable red sunglasses, ' +
      'on a day the experienced skiers kept calling terrible. I concluded it wasn’t for me and ' +
      'believed that for ten years. Last season I skied close to thirty days.';
    const out = truncateDescription(ski);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith('…')).toBe(true);
    expect(out.startsWith('At twenty-something I tried skiing once')).toBe(true);
    expect(out).not.toMatch(/\s…$/); // no space before the ellipsis
  });

  it('is idempotent — trimming an already-trimmed string changes nothing', () => {
    const once = truncateDescription('word '.repeat(100));
    expect(truncateDescription(once)).toBe(once);
  });

  it('backs out of a quotation the cut would leave open', () => {
    // the real case: "Show, Don't Tell"'s excerpt was previewed as
    // `…in medias res, and “show…`, a dangling quote mark
    const excerpt =
      'I recently took a storytelling workshop. One of the assignments was a personal story ' +
      'from a vivid moment in life: 400 words or less, in medias res, and “show, don’t tell.” ' +
      'I wrote about something tender, something I haven’t shared.';
    const out = truncateDescription(excerpt);
    expect(out).toBe(
      'I recently took a storytelling workshop. One of the assignments was a personal story ' +
        'from a vivid moment in life: 400 words or less, in medias res, and…'
    );
    expect(out).not.toContain('“');
  });

  it('keeps a quotation that closes before the cut', () => {
    const out = truncateDescription('She said “hello there” and then kept talking for a while', 40);
    expect(out).toBe('She said “hello there” and then kept…');
  });

  it('treats straight double quotes the same way', () => {
    const out = truncateDescription('He wrote "show, don’t tell" again and again', 20);
    expect(out).toBe('He wrote…');
  });

  it('keeps the cut when the whole text sits inside one long open quotation', () => {
    const out = truncateDescription('“' + 'word '.repeat(60), 30);
    expect(out.startsWith('“word')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles CJK, which has no spaces to break on', () => {
    const zh = '這本書用故事帶出死刑這個沉重的議題。'.repeat(20);
    const out = truncateDescription(zh);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith('…')).toBe(true);
  });
});
