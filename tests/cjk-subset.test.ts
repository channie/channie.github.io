/* Tests for scripts/subset-cjk.mjs — the build-time CJK font subsetter.

   The pure helpers are unit-tested; the last block runs the REAL font
   through subset-font so the size win and the woff2 output are proven
   against the actual asset rather than assumed. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { convert } from 'fontverter';
import {
  CJK_RANGES,
  cmapCodepoints,
  collectCjk,
  collectCjkFromDocuments,
  hashedName,
  isCjk,
  lostGlyphs,
  missingFrom,
  rewriteReferences,
  visibleText,
} from '../scripts/subset-cjk.mjs';

const fixture = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

describe('isCjk', () => {
  it('accepts Han, punctuation, bopomofo and fullwidth forms', () => {
    for (const ch of ['書', '八', '，', '。', '「', 'ㄅ', '！']) {
      expect(isCjk(ch), ch).toBe(true);
    }
  });

  it('rejects Latin, digits and symbols the Latin faces already cover', () => {
    for (const ch of ['a', 'Z', '5', '·', '—', '’', '×', ' ']) {
      expect(isCjk(ch), ch).toBe(false);
    }
  });

  it('covers every range it declares', () => {
    for (const [lo, hi] of CJK_RANGES) {
      expect(isCjk(String.fromCodePoint(lo))).toBe(true);
      expect(isCjk(String.fromCodePoint(hi))).toBe(true);
    }
  });
});

describe('visibleText', () => {
  it('drops script bodies so inline JS strings are not mistaken for content', () => {
    const html = '<p>書</p><script>const s = "臺灣";</script>';
    expect(collectCjk(html)).toEqual(new Set(['書']));
    expect(visibleText(html)).not.toContain('臺灣');
  });

  it('drops style bodies and comments', () => {
    const html = '<style>.x::after{content:"字"}</style><!-- 註解 --><p>光</p>';
    expect(collectCjk(html)).toEqual(new Set(['光']));
  });

  it('keeps attribute text, so alt and aria-label glyphs still count', () => {
    expect(collectCjk('<img alt="酥油 cover">')).toEqual(new Set(['酥', '油']));
  });
});

describe('collectCjk', () => {
  it('deduplicates repeated characters', () => {
    expect(collectCjk('<p>書書書光</p>')).toEqual(new Set(['書', '光']));
  });

  it('ignores tag names and Latin markup', () => {
    expect(collectCjk('<div class="zh-display">火</div>')).toEqual(new Set(['火']));
  });

  it('returns nothing for an all-Latin page', () => {
    expect(collectCjk('<h1>The Snow Was Bad That Day</h1>').size).toBe(0);
  });
});

describe('collectCjkFromDocuments', () => {
  it('unions across documents and sorts for a deterministic subset input', () => {
    const a = collectCjkFromDocuments(['<p>光書</p>', '<p>書火</p>']);
    const b = collectCjkFromDocuments(['<p>火書</p>', '<p>書光</p>']);
    expect(a).toBe(b); // order of pages must not change the result
    expect([...a].sort().join('')).toBe(a);
    expect(a).toContain('光');
    expect(a).toContain('火');
  });

  it('is empty when no document has CJK', () => {
    expect(collectCjkFromDocuments(['<p>hello</p>', '<p>world</p>'])).toBe('');
  });
});

describe('hashedName', () => {
  it('replaces Astro’s content hash with one derived from the new bytes', () => {
    const name = hashedName('lxgw-wenkai-tc-cht-400.BfqVVHHX.woff2', Buffer.from('abc'));
    expect(name).toMatch(/^lxgw-wenkai-tc-cht-400\.[A-Za-z0-9_-]{8}\.woff2$/);
    expect(name).not.toContain('BfqVVHHX');
  });

  it('gives different bytes different names — the whole point of the rename', () => {
    const a = hashedName('f.AAAAAAAA.woff2', Buffer.from('one'));
    const b = hashedName('f.AAAAAAAA.woff2', Buffer.from('two'));
    expect(a).not.toBe(b);
  });

  it('is stable for identical bytes, so an unchanged build keeps its URL', () => {
    expect(hashedName('f.AAAAAAAA.woff2', Buffer.from('same'))).toBe(
      hashedName('f.AAAAAAAA.woff2', Buffer.from('same')),
    );
  });

  it('still hashes a name that carries no hash segment', () => {
    expect(hashedName('plain.woff2', Buffer.from('x'))).toMatch(
      /^plain\.[A-Za-z0-9_-]{8}\.woff2$/,
    );
  });
});

describe('rewriteReferences', () => {
  it('rewrites every occurrence across a stylesheet', () => {
    const css = '@font-face{src:url(/_astro/a.OLD.woff2)}.x{y:url(/_astro/a.OLD.woff2)}';
    expect(rewriteReferences(css, { 'a.OLD.woff2': 'a.NEW.woff2' })).toBe(
      '@font-face{src:url(/_astro/a.NEW.woff2)}.x{y:url(/_astro/a.NEW.woff2)}',
    );
  });

  it('rewrites several fonts in one pass', () => {
    const out = rewriteReferences('a.OLD.woff2 and b.OLD.woff2', {
      'a.OLD.woff2': 'a.N1.woff2',
      'b.OLD.woff2': 'b.N2.woff2',
    });
    expect(out).toBe('a.N1.woff2 and b.N2.woff2');
  });

  it('leaves text alone when a name is unchanged', () => {
    expect(rewriteReferences('a.SAME.woff2', { 'a.SAME.woff2': 'a.SAME.woff2' })).toBe(
      'a.SAME.woff2',
    );
  });

  it('does not touch unrelated content', () => {
    const css = 'url(/_astro/newsreader-latin-400-normal.BFBkh4jY.woff2)';
    expect(rewriteReferences(css, { 'lxgw.OLD.woff2': 'lxgw.NEW.woff2' })).toBe(css);
  });
});

describe('missingFrom / lostGlyphs', () => {
  it('missingFrom reports characters absent from a coverage set', () => {
    expect(missingFrom(new Set([0x5149]), '光書')).toEqual(['書']);
  });

  it('lostGlyphs ignores characters the original never had', () => {
    // ！(U+FF01) is not in WenKai at all, so its absence is not a regression
    const original = new Set([0x5149]);
    const subset = new Set([0x5149]);
    expect(lostGlyphs(original, subset, '光！')).toEqual([]);
  });

  it('lostGlyphs flags a character the subset dropped but the original had', () => {
    const original = new Set([0x5149, 0x66f8]);
    const subset = new Set([0x5149]);
    expect(lostGlyphs(original, subset, '光書')).toEqual(['書']);
  });

  it('lostGlyphs is empty when the subset preserves everything', () => {
    const cov = new Set([0x5149, 0x66f8]);
    expect(lostGlyphs(cov, cov, '光書')).toEqual([]);
  });
});

/* End-to-end against the real asset: proves the win is real and that the
   output is a valid woff2, not just that the plumbing type-checks. */
describe('subsetting the real WenKai font', () => {
  const source = readFileSync(fixture('src/assets/fonts/lxgw-wenkai-tc-cht-400.woff2'));

  it('reads a real cmap, and the subset keeps exactly what was asked for', async () => {
    const used = collectCjkFromDocuments(['<p>基隆是被整個世界遺棄的。</p>']);
    const subset = await subsetFont(source, used, { targetFormat: 'woff2' });

    const originalCov = cmapCodepoints(await convert(source, 'truetype'));
    const subsetCov = cmapCodepoints(await convert(subset, 'truetype'));

    expect(originalCov.size).toBeGreaterThan(5000); // the full face
    expect(subsetCov.size).toBeLessThan(originalCov.size / 10); // a real cut
    expect(lostGlyphs(originalCov, subsetCov, used)).toEqual([]); // nothing dropped
    expect(subsetCov.has('基'.codePointAt(0)!)).toBe(true);
    expect(subsetCov.has('酥'.codePointAt(0)!)).toBe(false); // not requested
  }, 120_000);

  it('confirms WenKai has no fullwidth forms, which is why lostGlyphs compares to the original', async () => {
    const cov = cmapCodepoints(await convert(source, 'truetype'));
    for (const ch of '！？（），：；') {
      expect(cov.has(ch.codePointAt(0)!), ch).toBe(false);
    }
  }, 120_000);

  it('shrinks the font by an order of magnitude for a page-sized glyph set', async () => {
    const used = collectCjkFromDocuments([
      '<p>基隆是被整個世界遺棄的。</p>',
      '<p>愛，會讓世上每一個孤單的孩子，眼睛裡有光。</p>',
    ]);
    const subset = await subsetFont(source, used, { targetFormat: 'woff2' });

    expect(subset.length).toBeLessThan(source.length / 10);
    // woff2 magic bytes — the output really is a font, not a truncated blob
    expect(subset.subarray(0, 4).toString('latin1')).toBe('wOF2');
  }, 60_000);

  it('grows when more characters are needed, so coverage tracks content', async () => {
    const small = await subsetFont(source, '光', { targetFormat: 'woff2' });
    const large = await subsetFont(source, collectCjkFromDocuments(['<p>光書火山川海月日星</p>']), {
      targetFormat: 'woff2',
    });
    expect(large.length).toBeGreaterThan(small.length);
  }, 60_000);
});
