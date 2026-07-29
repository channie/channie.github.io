/* ============================================================
   prune-assets.mjs — drop the full-size source images Astro emits but
   never links.

   WHY: an image imported through the `image()` schema helper becomes a
   Vite asset, so the ORIGINAL file is emitted into _astro/ alongside the
   optimised variants that <Image>/<Picture> actually reference. Nothing
   links the originals, so no visitor downloads them — but they are still
   published, which means the full-resolution originals (book covers at
   4032×3024) sit at guessable public URLs when the site only ever shows
   them at ~520px.

   SAFETY — this is deliberately narrow:
   - only `_astro/` is considered, so everything hand-placed in `public/`
     (favicons, og/default.png, video/, robots.txt, CNAME) is untouchable;
   - only raster image types are eligible; fonts, audio, video, CSS and JS
     are never candidates, whatever the reference scan says;
   - a file is removed only if its filename appears in NO text file in the
     build (html/css/js/json/xml/webmanifest/txt), which covers src, href,
     srcset, inline styles and JSON payloads alike;
   - if an implausible share of images comes back unreferenced the build
     FAILS instead of pruning, because that means the scan broke, not that
     the images are dead.

   Every asset is content-hashed by Vite, so a pruned file can never be
   the target of a stale cached URL — the name changes when the bytes do.

   Pure helpers are exported for tests/prune-assets.test.ts; importing
   this module runs nothing.
   ============================================================ */
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Image types eligible for pruning. Anything else is never a candidate. */
export const PRUNABLE = /\.(avif|gif|jpe?g|png|webp)$/i;

/** File types that can carry a reference to an asset. */
export const REFERENCING = /\.(css|html|js|json|txt|webmanifest|xml)$/i;

/** Fail rather than prune if more than this share of images looks unused —
    a sign the reference scan is broken, not that the build is clean. */
export const MAX_PRUNE_RATIO = 0.6;

/**
 * Names in `assetNames` that appear in none of `documents`.
 * Matching is by filename, so it catches src, href, srcset and inline CSS
 * without having to model URL shapes.
 */
export function unreferencedAssets(assetNames, documents) {
  const haystack = documents.join('\n');
  return assetNames.filter((name) => !haystack.includes(name));
}

/** True when a path may be considered for pruning. */
export function isPrunable(pathFromDist) {
  return pathFromDist.startsWith('_astro/') && PRUNABLE.test(pathFromDist);
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
 * Astro integration. Add to `integrations` in astro.config.mjs, after the
 * font subsetter so it sees the final reference graph.
 */
export function pruneUnreferencedAssets() {
  return {
    name: 'prune-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = dir.pathname ? decodeURIComponent(dir.pathname) : String(dir);
        const files = walk(distDir);
        const rel = (f) => relative(distDir, f).split('\\').join('/');

        const candidates = files.filter((f) => isPrunable(rel(f)));
        if (candidates.length === 0) return;

        const documents = files
          .filter((f) => REFERENCING.test(f))
          .map((f) => readFileSync(f, 'utf8'));

        const names = candidates.map((f) => f.slice(f.lastIndexOf('/') + 1));
        const deadNames = new Set(unreferencedAssets(names, documents));

        if (deadNames.size === 0) {
          logger.info('no unreferenced images — nothing to prune');
          return;
        }

        const ratio = deadNames.size / candidates.length;
        if (ratio > MAX_PRUNE_RATIO) {
          throw new Error(
            `[prune-assets] ${deadNames.size} of ${candidates.length} images look unreferenced ` +
              `(${Math.round(ratio * 100)}%). That is too many to be real — the reference scan is ` +
              `probably broken, so nothing was pruned.`,
          );
        }

        let freed = 0;
        for (const f of candidates) {
          const name = f.slice(f.lastIndexOf('/') + 1);
          if (!deadNames.has(name)) continue;
          freed += statSync(f).size;
          unlinkSync(f);
        }

        logger.info(
          `pruned ${deadNames.size} unreferenced image(s), ${Math.round(freed / 1024)}kB ` +
            `(full-size originals Astro emits alongside the optimised variants)`,
        );
      },
    },
  };
}
