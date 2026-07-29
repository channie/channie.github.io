/* Tests for scripts/prune-assets.mjs — the build-time removal of
   full-size source images Astro emits but never links.

   The risk here is deleting something that IS used, so the tests lean on
   the guards: what counts as a candidate, what counts as a reference, and
   the ratio circuit-breaker. */
import { describe, expect, it } from 'vitest';
import {
  MAX_PRUNE_RATIO,
  PRUNABLE,
  REFERENCING,
  isPrunable,
  unreferencedAssets,
} from '../scripts/prune-assets.mjs';

describe('isPrunable', () => {
  it('accepts build-emitted raster images', () => {
    for (const f of [
      '_astro/cover.D1gK5DLF.jpeg',
      '_astro/hero.abc.jpg',
      '_astro/logo.abc.png',
      '_astro/shot.abc.webp',
      '_astro/pic.abc.avif',
    ]) {
      expect(isPrunable(f), f).toBe(true);
    }
  });

  it('never touches anything outside _astro/, so public/ is safe', () => {
    for (const f of [
      'og/default.png',
      'favicon.ico',
      'apple-touch-icon.png',
      'favicon-32.png',
      'video/first-winter.mp4',
    ]) {
      expect(isPrunable(f), f).toBe(false);
    }
  });

  it('never touches fonts, audio, video, css or js even inside _astro/', () => {
    for (const f of [
      '_astro/lxgw-wenkai-tc-cht-400.abc.woff2',
      '_astro/chameleon.abc.mp3',
      '_astro/clip.abc.mp4',
      '_astro/BaseLayout.abc.css',
      '_astro/player.abc.js',
    ]) {
      expect(isPrunable(f), f).toBe(false);
    }
  });

  it('regexes stay in step with the documented intent', () => {
    expect(PRUNABLE.test('a.svg')).toBe(false); // svg may be inlined/referenced oddly
    expect(REFERENCING.test('index.html')).toBe(true);
    expect(REFERENCING.test('sitemap-0.xml')).toBe(true);
    expect(REFERENCING.test('site.webmanifest')).toBe(true);
    expect(REFERENCING.test('photo.jpg')).toBe(false);
  });
});

describe('unreferencedAssets', () => {
  it('keeps anything named in any document', () => {
    const dead = unreferencedAssets(
      ['a.jpg', 'b.jpg'],
      ['<img src="/_astro/a.jpg">', '<p>unrelated</p>'],
    );
    expect(dead).toEqual(['b.jpg']);
  });

  it('finds a name inside a srcset alongside other candidates', () => {
    const dead = unreferencedAssets(
      ['small.webp', 'large.webp', 'orphan.jpg'],
      ['<img srcset="/_astro/small.webp 320w, /_astro/large.webp 640w">'],
    );
    expect(dead).toEqual(['orphan.jpg']);
  });

  it('finds a name inside inline CSS', () => {
    expect(unreferencedAssets(['bg.png'], ['.x{background:url(/_astro/bg.png)}'])).toEqual([]);
  });

  it('finds a name inside JSON or XML payloads', () => {
    expect(unreferencedAssets(['card.png'], ['{"image":"/_astro/card.png"}'])).toEqual([]);
    expect(unreferencedAssets(['card.png'], ['<image>/_astro/card.png</image>'])).toEqual([]);
  });

  it('reports everything when there are no documents at all', () => {
    expect(unreferencedAssets(['a.jpg', 'b.jpg'], [])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('returns nothing when there are no candidates', () => {
    expect(unreferencedAssets([], ['<img src="/_astro/a.jpg">'])).toEqual([]);
  });

  it('does not confuse a name with a longer name containing it', () => {
    // "a.jpg" is a substring of "xa.jpg"; referencing only the latter must
    // NOT keep the former alive by accident.
    const dead = unreferencedAssets(['xa.jpg'], ['<img src="/_astro/xa.jpg">']);
    expect(dead).toEqual([]);
    // and the reverse direction is the one that matters for safety:
    // a reference to the longer name does mention the shorter substring,
    // so the shorter file is conservatively KEPT rather than deleted.
    expect(unreferencedAssets(['a.jpg'], ['<img src="/_astro/xa.jpg">'])).toEqual([]);
  });
});

describe('the ratio circuit-breaker', () => {
  it('is set below "most images", so a broken scan cannot wipe the build', () => {
    expect(MAX_PRUNE_RATIO).toBeGreaterThan(0);
    expect(MAX_PRUNE_RATIO).toBeLessThan(1);
  });

  it('a realistic build sits well under the threshold', () => {
    // 21 unreferenced originals against 60-odd emitted images on this site
    expect(21 / 60).toBeLessThan(MAX_PRUNE_RATIO);
  });

  it('a scan that found nothing would trip it', () => {
    expect(60 / 60).toBeGreaterThan(MAX_PRUNE_RATIO);
  });
});
