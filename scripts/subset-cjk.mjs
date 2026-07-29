/* ============================================================
   subset-cjk.mjs — cut the CJK webfonts down to the characters the
   site actually renders.

   WHY: LXGW WenKai ships ~13k glyphs per weight (1.9MB each). The whole
   site writes ~570 distinct characters, so >90% of every download was
   glyphs nobody reads. Both weights load on /reading/ and /listening/,
   so that was ~3.9MB of font on the two pages with the most to say.

   WHEN IT RUNS: only on `astro build`, via the `astro:build:done` hook.
   **`astro dev` is deliberately untouched and serves the full font**, so
   authoring always previews every character — including one typed a
   second ago — with nothing to regenerate. The subset is a packaging
   step, like image optimisation, never something you author against.

   HOW IT'S SAFE: the glyph set is harvested from the HTML the build just
   emitted, so it is derived from the content rather than pinned to a list
   that could drift. Every Chinese character on this site is server-
   rendered (no island injects CJK — the players only write digits like
   "1:00"), so the built HTML is the complete picture.

   CACHE CORRECTNESS: the subset is renamed by a hash of its own bytes.
   Reusing Astro's original filename would leave returning visitors on a
   stale subset after new content added new characters, and those would
   silently drop to a system font. Renaming means new content = new URL.

   The pure helpers are exported for tests/cjk-subset.test.ts (same
   pattern as fetch-podcast.mjs); this module runs nothing on import.
   ============================================================ */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import subsetFont from 'subset-font';
import { convert } from 'fontverter';

/** Codepoint ranges that must resolve to WenKai. Mirrors the
    `unicode-range` in src/styles/fonts-cjk.css — keep the two in step. */
export const CJK_RANGES = [
  [0x2e80, 0x2fdf], // radicals
  [0x3000, 0x303f], // CJK punctuation
  [0x3100, 0x312f], // bopomofo
  [0x3190, 0x31ef], // kanbun / strokes
  [0x3400, 0x4dbf], // ext A
  [0x4e00, 0x9fff], // unified ideographs
  [0xf900, 0xfaff], // compatibility ideographs
  [0xfe30, 0xfe4f], // compatibility forms
  [0xff00, 0xffef], // fullwidth forms
];

/** True when `ch` is a character the CJK face is responsible for. */
export function isCjk(ch) {
  const cp = ch.codePointAt(0);
  return CJK_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

/** Strip the parts of an HTML document that never become visible text.
    Script and style bodies are dropped whole; everything else keeps its
    text so attributes like alt/title/aria-label are still counted. */
export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Every distinct CJK character in one HTML document. */
export function collectCjk(html) {
  const found = new Set();
  for (const ch of visibleText(html)) if (isCjk(ch)) found.add(ch);
  return found;
}

/** Union of `collectCjk` across many documents, returned sorted so the
    subset input (and therefore its hash) is deterministic. */
export function collectCjkFromDocuments(documents) {
  const all = new Set();
  for (const doc of documents) for (const ch of collectCjk(doc)) all.add(ch);
  return [...all].sort().join('');
}

/** Astro emits `name.<hash>.woff2`; swap in a hash of the new bytes so a
    changed subset can never be served from a stale cache entry. */
export function hashedName(originalName, bytes) {
  const digest = createHash('sha256').update(bytes).digest('base64url').slice(0, 8);
  const m = originalName.match(/^(.*?)\.[A-Za-z0-9_-]+(\.woff2)$/);
  return m ? `${m[1]}.${digest}${m[2]}` : originalName.replace(/\.woff2$/, `.${digest}.woff2`);
}

/** Apply a {oldFilename: newFilename} rename map to a text file's
    contents (the CSS that references the fonts). */
export function rewriteReferences(text, renames) {
  let out = text;
  for (const [from, to] of Object.entries(renames)) {
    if (from !== to) out = out.split(from).join(to);
  }
  return out;
}

/* ---- coverage proof -------------------------------------------------
   Subsetting silently dropping a character would show up as a system-font
   fallback on the live site and nowhere else. So rather than trust the
   subsetter, the build reads the cmap of the font it just wrote and
   checks every harvested character really maps to a glyph. */

/** Codepoints a TrueType `cmap` maps to a real (non-zero) glyph.
    Handles format 4 (BMP) and format 12 (full range); CJK subsets use
    one or the other depending on what survived. */
export function cmapCodepoints(ttf) {
  const covered = new Set();
  const numTables = ttf.readUInt16BE(4);

  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (ttf.toString('latin1', rec, rec + 4) === 'cmap') cmapOffset = ttf.readUInt32BE(rec + 8);
  }
  if (cmapOffset < 0) return covered;

  const numSub = ttf.readUInt16BE(cmapOffset + 2);
  const subtables = [];
  for (let i = 0; i < numSub; i++) {
    const rec = cmapOffset + 4 + i * 8;
    subtables.push({
      platformID: ttf.readUInt16BE(rec),
      encodingID: ttf.readUInt16BE(rec + 2),
      offset: cmapOffset + ttf.readUInt32BE(rec + 4),
    });
  }
  // Prefer a full-range Unicode subtable, else any Unicode one.
  const pick =
    subtables.find((s) => s.platformID === 3 && s.encodingID === 10) ??
    subtables.find((s) => s.platformID === 3 && s.encodingID === 1) ??
    subtables.find((s) => s.platformID === 0) ??
    subtables[0];
  if (!pick) return covered;

  const format = ttf.readUInt16BE(pick.offset);

  if (format === 4) {
    const segCount = ttf.readUInt16BE(pick.offset + 6) / 2;
    const endBase = pick.offset + 14;
    const startBase = endBase + segCount * 2 + 2;
    const deltaBase = startBase + segCount * 2;
    const rangeBase = deltaBase + segCount * 2;

    for (let s = 0; s < segCount; s++) {
      const end = ttf.readUInt16BE(endBase + s * 2);
      const start = ttf.readUInt16BE(startBase + s * 2);
      const delta = ttf.readInt16BE(deltaBase + s * 2);
      const rangeOffset = ttf.readUInt16BE(rangeBase + s * 2);
      if (start === 0xffff) continue;

      for (let cp = start; cp <= end && cp !== 0x10000; cp++) {
        let glyph;
        if (rangeOffset === 0) {
          glyph = (cp + delta) & 0xffff;
        } else {
          const addr = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
          if (addr + 2 > ttf.length) continue;
          glyph = ttf.readUInt16BE(addr);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) covered.add(cp);
      }
    }
  } else if (format === 12) {
    const nGroups = ttf.readUInt32BE(pick.offset + 12);
    for (let g = 0; g < nGroups; g++) {
      const rec = pick.offset + 16 + g * 12;
      const start = ttf.readUInt32BE(rec);
      const end = ttf.readUInt32BE(rec + 4);
      const startGlyph = ttf.readUInt32BE(rec + 8);
      for (let cp = start; cp <= end; cp++) {
        if (startGlyph + (cp - start) !== 0) covered.add(cp);
      }
    }
  }

  return covered;
}

/** Characters in `used` that the font does NOT map to a glyph. */
export function missingFrom(coveredCodepoints, used) {
  return [...used].filter((ch) => !coveredCodepoints.has(ch.codePointAt(0)));
}

/**
 * Characters the SUBSET dropped that the ORIGINAL could actually render.
 *
 * The comparison has to be against the original's own coverage, not against
 * everything the page uses: WenKai TC has no fullwidth forms at all (no
 * U+FF00–FFEF), so `！？（），` already fall back to a system face on the
 * live site. Measuring against `used` would flag those every build and make
 * the check noise. Losing something the original HAD is the real regression.
 */
export function lostGlyphs(originalCovered, subsetCovered, used) {
  return [...used].filter(
    (ch) => originalCovered.has(ch.codePointAt(0)) && !subsetCovered.has(ch.codePointAt(0)),
  );
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Astro integration. Add to `integrations` in astro.config.mjs.
 * Runs after the build writes dist/, and fails the build rather than
 * shipping a half-rewritten font graph.
 */
export function cjkSubset({ match = /lxgw-wenkai/ } = {}) {
  return {
    name: 'cjk-subset',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = dir.pathname ? decodeURIComponent(dir.pathname) : String(dir);
        const files = walk(distDir);

        const fonts = files.filter((f) => match.test(f) && f.endsWith('.woff2'));
        if (fonts.length === 0) {
          logger.warn('no CJK font found in the build output — nothing subsetted');
          return;
        }

        const html = files.filter((f) => f.endsWith('.html')).map((f) => readFileSync(f, 'utf8'));
        const used = collectCjkFromDocuments(html);
        if (!used) {
          logger.warn('the build renders no CJK — leaving the fonts untouched');
          return;
        }

        const renames = {};
        let before = 0;
        let after = 0;

        for (const fontPath of fonts) {
          const original = readFileSync(fontPath);
          const subset = await subsetFont(original, used, { targetFormat: 'woff2' });

          // A subset larger than its source means the subset failed to
          // apply; shipping it would be a silent 2MB regression.
          if (subset.length >= original.length) {
            throw new Error(
              `[cjk-subset] ${relative(distDir, fontPath)} did not shrink ` +
                `(${original.length} → ${subset.length} bytes) — refusing to ship it`,
            );
          }

          // Prove the subset still renders everything the original could.
          // A silently dropped glyph would only surface as a system-font
          // fallback on the live site, so it has to fail the build instead.
          const lost = lostGlyphs(
            cmapCodepoints(await convert(original, 'truetype')),
            cmapCodepoints(await convert(subset, 'truetype')),
            used,
          );
          if (lost.length) {
            throw new Error(
              `[cjk-subset] ${relative(distDir, fontPath)} lost ${lost.length} ` +
                `character(s) the original could render: ${lost.slice(0, 20).join(' ')}` +
                `${lost.length > 20 ? ' …' : ''}`,
            );
          }

          const oldName = fontPath.slice(fontPath.lastIndexOf('/') + 1);
          const newName = hashedName(oldName, subset);
          writeFileSync(fontPath, subset);
          renameSync(fontPath, join(fontPath.slice(0, fontPath.lastIndexOf('/')), newName));

          renames[oldName] = newName;
          before += original.length;
          after += subset.length;
        }

        // Point every reference at the renamed files.
        for (const f of files) {
          if (!/\.(css|html|js|json|xml)$/.test(f)) continue;
          const text = readFileSync(f, 'utf8');
          const next = rewriteReferences(text, renames);
          if (next !== text) writeFileSync(f, next);
        }

        // A missed reference is a 404'd font, which degrades silently in
        // the browser — so prove no stale name survives anywhere.
        const stale = [];
        for (const f of walk(distDir)) {
          if (!/\.(css|html|js|json|xml)$/.test(f)) continue;
          const text = readFileSync(f, 'utf8');
          for (const oldName of Object.keys(renames)) {
            if (renames[oldName] !== oldName && text.includes(oldName)) {
              stale.push(`${relative(distDir, f)} still references ${oldName}`);
            }
          }
        }
        if (stale.length) {
          throw new Error(`[cjk-subset] stale font references after rewrite:\n  ${stale.join('\n  ')}`);
        }

        const kb = (n) => `${Math.round(n / 1024)}kB`;
        logger.info(
          `${Object.keys(renames).length} CJK font(s), ${[...used].length} glyphs: ` +
            `${kb(before)} → ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`,
        );
      },
    },
  };
}
