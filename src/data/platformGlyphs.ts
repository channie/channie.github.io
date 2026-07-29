/* ============================================================
   Platform glyphs — monochrome inline-SVG markup (currentColor),
   keyed by platform slug. The SINGLE source of platform artwork
   across the site: the Podcast page's "Listen & subscribe" pills
   (PlatformRow), the homepage band's "Listen on" chips (PodcastBand),
   and the Listening detail "quiet links" + styleguide (via Icon's
   `platform-*` names) — one drawing per brand, so nothing can drift.
   Render with `set:html` inside a sized, `aria-hidden` wrapper.
   ============================================================ */
const PLATFORM_GLYPHS: Record<string, string> = {
  spotify:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5.5 9.2c4-1.2 8.2-.8 11.6 1.3"/><path d="M6.3 13c3.2-.9 6.6-.6 9.4 1.1"/><path d="M7.2 16.4c2.5-.7 5-.4 7.2.9"/></svg>',
  apple:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="2.4" fill="currentColor" stroke="none"/><path d="M7.4 13.4a6 6 0 0 1 9.2 0"/><path d="M10 17.5c.5 2.4.7 3.4 2 3.4s1.5-1 2-3.4a4 4 0 0 0-4 0Z" fill="currentColor" stroke="none"/></svg>',
  amazon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M10 9 L15 12 L10 15 Z" fill="currentColor" stroke="none"/></svg>',
  pocketcasts:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6 L16 12 L10.2 15.4 Z" fill="currentColor" stroke="none"/></svg>',
  castbox:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M9 14.5v-5"/><path d="M12 16v-8"/><path d="M15 13.5v-3"/></svg>',
  podcastaddict:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 13v-1a7 7 0 0 1 14 0v1"/><rect x="4" y="13" width="3.4" height="6" rx="1.5" fill="currentColor" stroke="none"/><rect x="16.6" y="13" width="3.4" height="6" rx="1.5" fill="currentColor" stroke="none"/></svg>',
  kkbox:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M9.5 8v8 M9.5 12 L14 8 M11.2 10.6 L14.5 16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  soundon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 12h2.2M8.4 8.5v7M11.8 5.5v13M15.2 8.5v7M18.6 11h1.4"/></svg>',
  // iHeart's heart-with-broadcasting-figure mark. SOLID (like their real
  // logo): a filled heart with the figure — head, body, two "arms up" sound
  // waves — knocked out as negative space (evenodd). Fills stay crisp at pill
  // size where the old thin-stroke version went muddy.
  iheart:
    '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M12 20.9C5.5 16 2.6 12.5 2.6 8.85A3.6 3.6 0 0 1 12 6.6A3.6 3.6 0 0 1 21.4 8.85C21.4 12.5 18.5 16 12 20.9ZM12 7.7A1.35 1.35 0 1 0 12 10.4A1.35 1.35 0 0 0 12 7.7ZM10.75 11.2A1.25 1.25 0 0 1 13.25 11.2V14.3A1.25 1.25 0 0 1 10.75 14.3ZM9.3 12.9A3.6 3.6 0 0 1 9.3 7.3A1.5 1.5 0 0 0 9.3 12.9ZM14.7 12.9A3.6 3.6 0 0 0 14.7 7.3A1.5 1.5 0 0 1 14.7 12.9Z"/></svg>',
  // Goodpods' headphones-as-a-smiley mark, distilled from their logo into a
  // clean solid icon: a filled headband + two ear cups + a smile.
  goodpods:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.4A7.8 7.8 0 0 0 4.2 11.2v.6a1.6 1.6 0 0 1 1.7-.15 6.8 6.8 0 0 1 12.2 0 1.6 1.6 0 0 1 1.7.15v-.6A7.8 7.8 0 0 0 12 3.4Z"/><rect x="3.3" y="12" width="3.5" height="6.1" rx="1.75"/><rect x="17.2" y="12" width="3.5" height="6.1" rx="1.75"/><path d="M8.9 16a1.05 1.05 0 0 1 1.6-.05 2.3 2.3 0 0 0 3 0 1.05 1.05 0 1 1 1.4 1.55 4.4 4.4 0 0 1-5.8 0A1.05 1.05 0 0 1 8.9 16Z"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M10.5 9 L15 12 L10.5 15 Z" fill="currentColor" stroke="none"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
  // Generic "show page" link (no specific platform) — used by the Listening
  // quiet links when a URL matches no known platform host.
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a4 4 0 0 0 5.7.3l2.6-2.6a4 4 0 0 0-5.6-5.7l-1.3 1.3"/><path d="M14 11a4 4 0 0 0-5.7-.3L5.7 13.3a4 4 0 0 0 5.6 5.7l1.3-1.3"/></svg>',
};

/** Glyph markup for a slug; unknown slugs get the generic "more" dots. */
export const platformGlyph = (slug: string): string =>
  PLATFORM_GLYPHS[slug] ?? PLATFORM_GLYPHS.more;
