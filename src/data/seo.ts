/* ============================================================
   SEO exclusions — the single list of pages kept out of search.

   Keeping a page out of search takes TWO independent mechanisms,
   and they must not drift:
   1. a `noindex` robots meta — pass `noindex` to <BaseLayout> on
      the page itself;
   2. exclusion from the sitemap — astro.config.mjs filters the
      sitemap against this list.

   When you noindex a new page, add its path here AND pass the prop.
   ============================================================ */

/** Route path prefixes excluded from the sitemap (and noindex'd on-page). */
export const NOINDEX_PATHS = ['/styleguide'];

/** True if a (full URL or path) string points at a noindex'd route. */
export const isNoindexPage = (page: string): boolean =>
  NOINDEX_PATHS.some((p) => page.includes(p));
