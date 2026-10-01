/* ============================================================
   experiments.ts — which post the Experimenting page features.

   Rule: a post with `featured: true` is featured; with none flagged,
   the newest post is. AT MOST ONE post may be flagged. Two flags used
   to pass silently (the newest flagged one won), which left a stale
   flag behind that would quietly resurface an old post the day the
   newer flag was removed. So two or more is now a build error that
   names the posts.

   Pure (no astro:content import), so it is unit-tested directly.
   ============================================================ */

/** The fields this module reads from an experiments collection entry. */
export interface FeaturablePost {
  id: string;
  data: { date: Date; featured: boolean };
}

/**
 * Split published posts into the featured one and the rest, both
 * newest first. Throws if more than one post is flagged `featured`.
 * Pass posts with drafts already filtered out: a hidden draft can't
 * be featured, so its flag shouldn't count.
 */
export function splitFeatured<T extends FeaturablePost>(
  posts: readonly T[]
): { featured: T | undefined; rest: T[] } {
  const sorted = [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const flagged = sorted.filter((p) => p.data.featured);
  if (flagged.length > 1) {
    throw new Error(
      `[experiments] ${flagged.length} posts have \`featured: true\` ` +
        `(${flagged.map((p) => p.id).join(', ')}). Mark at most one; ` +
        `with none marked, the newest post is featured.`
    );
  }
  const featured = flagged[0] ?? sorted[0];
  return { featured, rest: sorted.filter((p) => p !== featured) };
}
