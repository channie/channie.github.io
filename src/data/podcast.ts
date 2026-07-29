/* ============================================================
   Podcast data.
   - podcastMeta: the Podcast PAGE head copy + SEO meta description.
   - podcastPlatforms: the SINGLE source of truth for every platform
     the show is on. The page's "Listen & subscribe" pills render the
     whole list, the share page's big follow buttons render it with
     each platform's brand color, and the homepage band derives its
     teaser chips from it (by slug) — so none of them can drift.
   - podcastBand: homepage band chrome + generic fallbacks (the real
     episode data comes from the RSS snapshot via src/lib/podcast.ts).
   ============================================================ */
// Show logo — the band's cover fallback for the empty-feed edge case
// (the band normally shows the latest episode's own artwork).
import podcastCover from '../assets/images/podcast-logo.png';

/** The standalone follow/share page — where "more platforms" leads. */
export const podcastShareUrl = '/podcast-share/';

export const podcastMeta = {
  eyebrow: 'The Podcast',
  tagline:
    'French culture and language, seen through the eyes of someone discovering it from the outside — one curiosity at a time.',
  // The page subtitle — the show's origin story (overrides the RSS description
  // for the visible intro on /podcast).
  description:
    "I started this podcast because the show I wanted to listen to didn’t exist. The deeper I got into French culture and language, the harder it was to find anything that fit. Podcasts for French learners keep the culture relatively basic, while the ones made for native speakers go deep but at a pace my French has a hard time catching up to. That middle ground turned out to be surprisingly empty, so I built it myself: somewhere to finally chase down the questions I’d been sitting on for years, exploring French culture and language one curiosity at a time.",
  // Concise SEO / OG meta description (~150 chars) — the origin story is too
  // long for a meta tag, so use this for <meta name="description"> on /podcast.
  metaDescription:
    'The French podcast I couldn’t find, so I made it: past beginner, not yet native — exploring French culture and language one curiosity at a time.',
};

export interface PodcastPlatform {
  /** glyph key in platformGlyphs.ts */
  slug: string;
  name: string;
  url: string;
  /** brand color — used where the icon renders colored (the share page) */
  color: string;
}

/** Every platform the show is on. Order matters: Apple → Spotify → YouTube
    lead (the big three), then the rest. Add/remove/repoint platforms HERE —
    the page pills, the share page buttons, and the homepage band chips all
    follow. */
export const podcastPlatforms: PodcastPlatform[] = [
  {
    slug: 'apple',
    name: 'Apple Podcasts',
    url: 'https://podcasts.apple.com/us/podcast/french-one-curiosity-at-a-time/id1896311586',
    color: '#A64FE8',
  },
  {
    slug: 'spotify',
    name: 'Spotify',
    url: 'https://open.spotify.com/show/6CqQNgOlLnBzLJYaF8HfgC',
    color: '#1DB954',
  },
  {
    slug: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/@FrenchCuriosityPodcast',
    color: '#FF0000',
  },
  {
    slug: 'amazon',
    name: 'Amazon Music',
    url: 'https://music.amazon.com/podcasts/deca37d3-f451-4325-866f-570105bb187a/french-one-curiosity-at-a-time',
    color: '#25D1DA',
  },
  {
    slug: 'iheart',
    name: 'iHeartRadio',
    url: 'https://iheart.com/podcast/338948380/',
    color: '#C6002B',
  },
  {
    slug: 'goodpods',
    // Goodpods' brand is a bright yellow that vanishes on the cream card, so the
    // colored button uses the navy from their headphones (still their logo's ink).
    name: 'Goodpods',
    url: 'https://goodpods.com/podcasts/french-one-curiosity-at-a-time-740069',
    color: '#17233F',
  },
  {
    slug: 'kkbox',
    name: 'KKBOX',
    url: 'https://podcast.kkbox.com/tw/channel/DahqEMcPym8OB4siOY',
    color: '#00C56F',
  },
  {
    slug: 'soundon',
    name: 'SoundOn',
    url: 'https://player.soundon.fm/p/5c11c169-2dfa-45b6-92d7-510edcbd5bd7',
    color: '#5B4EE5',
  },
  {
    slug: 'castbox',
    name: 'Castbox',
    url: 'https://castbox.fm/channel/id7207372',
    color: '#F55B23',
  },
  {
    slug: 'podcastaddict',
    name: 'Podcast Addict',
    url: 'https://podcastaddict.com/podcast/french-one-curiosity-at-a-time/7024017',
    color: '#F4801F',
  },
];

/* The homepage band shows a short teaser: the big three + a link to the rest.
   Derived from podcastPlatforms so a URL fixed there is fixed everywhere. */
const BAND_PICKS = ['apple', 'spotify', 'youtube'];

export const podcastBand = {
  eyebrow: 'Latest episode',
  cover: podcastCover,
  /* Fallbacks for the empty-feed edge case only (the band renders live
     snapshot data whenever an episode exists) — kept generic so they
     can't go stale. */
  title: 'French, One Curiosity at a Time',
  meta: 'New episodes on the way',
  length: '–:––',
  platforms: [
    ...podcastPlatforms
      .filter((p) => BAND_PICKS.includes(p.slug))
      .map(({ slug, name, url }) => ({ slug, name, url })),
    { slug: 'more', name: 'More platforms', url: podcastShareUrl },
  ],
};
