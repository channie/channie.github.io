/* ============================================================
   Local podcast artwork resolver.

   scripts/fetch-podcast.mjs mirrors the show/episode covers into
   src/assets/podcast/ and stamps each record with its `imageFile`.
   This maps that filename to the bundled, optimized ImageMetadata —
   the site NEVER hotlinks the podcast host's CDN at runtime (privacy +
   outage-proofing, the same contract as the JSON snapshot).

   Kept separate from podcast.ts so the feed accessor stays free of
   asset imports (and importable from plain-Node unit tests).
   ============================================================ */
import type { ImageMetadata } from 'astro';
import fallback from '../assets/images/podcast-logo.png';

const mirrored = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/podcast/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true }
);

/** Resolve a mirrored `imageFile` to its optimized image; show logo as fallback. */
export function podcastImage(imageFile: string | null | undefined): ImageMetadata {
  if (imageFile) {
    const hit = mirrored[`../assets/podcast/${imageFile}`];
    if (hit) return hit.default;
  }
  return fallback;
}
