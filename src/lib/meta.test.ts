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

  it('handles CJK, which has no spaces to break on', () => {
    const zh = '這本書用故事帶出死刑這個沉重的議題。'.repeat(20);
    const out = truncateDescription(zh);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith('…')).toBe(true);
  });
});
