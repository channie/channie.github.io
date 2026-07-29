/* ============================================================
   Podcast feed accessor. The podcast RSS feed is fetched + parsed
   into src/data/podcast-feed.json by scripts/fetch-podcast.mjs (run
   on a schedule). The build reads ONLY that committed snapshot, so a
   feed outage can never break a deploy.

   The snapshot is produced by a separate untyped script, so it is
   validated here with zod ONCE per build — if the script's output
   ever drifts from what the site expects, the build fails with a
   clear message instead of `undefined` leaking into the UI. The
   Episode/PodcastFeed types are inferred from the same schema, so
   the validation and the types can't disagree.
   ============================================================ */
import { z } from 'astro/zod';
import feed from '../data/podcast-feed.json';

const httpsUrl = z.url().refine((url) => new URL(url).protocol === 'https:', {
  message: 'must be an HTTPS URL',
});
const optionalHttpsUrl = z.literal('').or(httpsUrl);

const episodeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  /** ISO date ('' if the feed's pubDate was unparsable) */
  date: z.string(),
  /** e.g. "Jun 6, 2026" */
  dateLabel: z.string(),
  durationSeconds: z.number(),
  /** e.g. "32:06" */
  duration: z.string(),
  /** e.g. "32 min" */
  minutes: z.string(),
  /** streamable CDN MP3 URL */
  audioUrl: httpsUrl,
  /** the episode's page (for "listen elsewhere") */
  pageUrl: httpsUrl,
  number: z.number().nullable(),
  /** remote artwork URL from the feed (reference only — never rendered) */
  image: optionalHttpsUrl,
  /** locally-mirrored artwork filename in src/assets/podcast/ (see podcastImages.ts) */
  imageFile: z.string().nullable(),
});

const feedSchema = z.object({
  show: z.object({
    title: z.string().min(1),
    description: z.string(),
    image: optionalHttpsUrl,
    imageFile: z.string().nullable(),
    link: optionalHttpsUrl,
  }),
  latest: episodeSchema.nullable(),
  episodes: z.array(episodeSchema),
  fetchedAt: z.string(),
});

export type Episode = z.infer<typeof episodeSchema>;
export type PodcastFeed = z.infer<typeof feedSchema>;

let cached: PodcastFeed | undefined;

export function getPodcast(): PodcastFeed {
  return (cached ??= feedSchema.parse(feed));
}
