import { describe, it, expect } from 'vitest';
import {
  parseFeed,
  imageFileName,
  imageFetchProblem,
  artworkUrlProblem,
  fetchArtwork,
  validateParsedFeed,
} from '../scripts/fetch-podcast.mjs';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title><![CDATA[My Show]]></title>
<description><![CDATA[<p>About the show.</p> <br/>Powered by <a href="https://firstory.me/zh">Firstory Hosting</a>]]></description>
<link>https://show.example/user/abc</link>
<itunes:image href="https://img.example/cover.jpg"/>
<item>
<title><![CDATA[Episode Two]]></title>
<description><![CDATA[<p>Second ep.<br />More.</p>]]></description>
<link>https://show.example/story/2</link>
<pubDate>Sat, 06 Jun 2026 01:00:00 GMT</pubDate>
<enclosure url="https://cdn.example/2.mp3" length="0" type="audio/mpeg"/>
<itunes:duration>1926</itunes:duration>
<itunes:image href="https://img.example/2.jpg"/>
<itunes:episode>2</itunes:episode>
</item>
<item>
<title><![CDATA[Episode One]]></title>
<description><![CDATA[First ep.]]></description>
<link>https://show.example/story/1</link>
<pubDate>Tue, 05 May 2026 16:00:00 GMT</pubDate>
<enclosure url="https://cdn.example/1.mp3" length="0" type="audio/mpeg"/>
<itunes:duration>65</itunes:duration>
<itunes:episode>1</itunes:episode>
</item>
</channel></rss>`;

describe('parseFeed', () => {
  const feed = parseFeed(SAMPLE);

  it('parses show meta and strips the Firstory footer', () => {
    expect(feed.show.title).toBe('My Show');
    expect(feed.show.description).toBe('About the show.');
    expect(feed.show.image).toBe('https://img.example/cover.jpg');
    expect(feed.show.link).toBe('https://show.example/user/abc');
  });

  it('returns episodes newest-first with the right latest', () => {
    expect(feed.episodes).toHaveLength(2);
    expect(feed.latest.title).toBe('Episode Two');
    expect(feed.episodes[0].title).toBe('Episode Two');
    expect(feed.episodes[1].title).toBe('Episode One');
  });

  it('extracts audio URL, duration, date and image', () => {
    const ep = feed.latest;
    expect(ep.audioUrl).toBe('https://cdn.example/2.mp3');
    expect(ep.durationSeconds).toBe(1926);
    expect(ep.duration).toBe('32:06');
    expect(ep.minutes).toBe('32 min');
    expect(ep.number).toBe(2);
    expect(ep.image).toBe('https://img.example/2.jpg');
    expect(ep.pageUrl).toBe('https://show.example/story/2');
    expect(ep.dateLabel).toBe('Jun 6, 2026');
  });

  it('cleans HTML and <br> from descriptions', () => {
    expect(feed.latest.description).toBe('Second ep. More.');
  });

  it('parses HH:MM:SS durations (anchor.fm host) as well as raw seconds', () => {
    const clock = parseFeed(
      `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title><![CDATA[S]]></title>
<item><title>A</title><pubDate>Sat, 06 Jun 2026 01:00:00 GMT</pubDate>
<enclosure url="https://cdn.example/a.mp3"/><itunes:duration>00:34:58</itunes:duration></item>
</channel></rss>`,
    ).latest;
    expect(clock.durationSeconds).toBe(2098);
    expect(clock.duration).toBe('34:58');
    expect(clock.minutes).toBe('35 min');
  });

  it('falls back to the show image when an episode has none', () => {
    expect(feed.episodes[1].image).toBe('https://img.example/cover.jpg');
  });

  it('returns a null latest for an empty feed', () => {
    const empty = parseFeed('<rss><channel><title>X</title></channel></rss>');
    expect(empty.latest).toBeNull();
    expect(empty.episodes).toHaveLength(0);
  });

  it('drops episodes without an HTTPS audio URL', () => {
    const feed = parseFeed(
      `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title><![CDATA[S]]></title>
<item><title>HTTP audio</title><link>https://show.example/http</link>
<enclosure url="http://cdn.example/a.mp3"/><itunes:duration>10</itunes:duration></item>
<item><title>Bad audio</title><link>https://show.example/bad</link>
<enclosure url="not a url"/><itunes:duration>10</itunes:duration></item>
<item><title>Good audio</title><link>https://show.example/good</link>
<enclosure url="https://cdn.example/good.mp3"/><itunes:duration>10</itunes:duration></item>
</channel></rss>`,
    );

    expect(feed.episodes.map((e) => e.title)).toEqual(['Good audio']);
    expect(feed.latest?.audioUrl).toBe('https://cdn.example/good.mp3');
  });

  it('normalizes optional feed URLs and falls back to audio for unsafe page links', () => {
    const feed = parseFeed(
      `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title><![CDATA[S]]></title>
<link>http://show.example/not-safe</link>
<itunes:image href="http://img.example/cover.jpg"/>
<item><title>Episode</title><link>javascript:alert(1)</link>
<enclosure url="https://cdn.example/good.mp3"/><itunes:image href="ftp://img.example/cover.jpg"/></item>
</channel></rss>`,
    );

    expect(feed.show.link).toBe('');
    expect(feed.show.image).toBe('');
    expect(feed.latest?.pageUrl).toBe('https://cdn.example/good.mp3');
    expect(feed.latest?.image).toBe('');
  });
});

describe('imageFileName', () => {
  it('is deterministic and ASCII-safe (hash + extension)', () => {
    const a = imageFileName('https://img.example/Avatar/某中文路徑/cover.jpg');
    expect(a).toBe(imageFileName('https://img.example/Avatar/某中文路徑/cover.jpg'));
    expect(a).toMatch(/^[0-9a-f]{12}\.jpg$/);
  });
  it('differs per URL and preserves known extensions', () => {
    expect(imageFileName('https://x.example/a.png')).not.toBe(imageFileName('https://x.example/b.png'));
    expect(imageFileName('https://x.example/a.PNG')).toMatch(/\.png$/);
    expect(imageFileName('https://x.example/no-extension')).toMatch(/\.jpg$/);
  });
  it('returns null for a missing URL', () => {
    expect(imageFileName('')).toBeNull();
    expect(imageFileName(undefined)).toBeNull();
  });
  it('returns null for non-HTTPS or malformed URLs', () => {
    expect(imageFileName('http://x.example/a.png')).toBeNull();
    expect(imageFileName('ftp://x.example/a.png')).toBeNull();
    expect(imageFileName('not a url')).toBeNull();
  });
});

describe('imageFetchProblem', () => {
  const OK_URL = 'https://img.example/cover.jpg';
  // A minimal buffer with a JPEG magic number (ff d8 ff …), padded to `size`.
  const jpegBytes = (size = 64) => {
    const b = Buffer.alloc(Math.max(size, 12));
    b[0] = 0xff;
    b[1] = 0xd8;
    b[2] = 0xff;
    b[3] = 0xe0;
    return b;
  };

  it('accepts image bytes regardless of content-type (sniffs the magic number)', () => {
    // the anchor.fm CDN serves genuine JPEGs as application/octet-stream, so
    // the decision is by leading bytes, not the (absent) image/* header.
    expect(imageFetchProblem(OK_URL, jpegBytes(120_000))).toBeNull();
    expect(imageFetchProblem(OK_URL, jpegBytes())).toBeNull();
  });
  it('rejects non-https and unparsable URLs', () => {
    expect(imageFetchProblem('http://img.example/cover.jpg', jpegBytes())).toMatch(/https/);
    expect(imageFetchProblem('not a url', jpegBytes())).toMatch(/unparsable/);
  });
  it('rejects bytes that are not a recognized image', () => {
    expect(imageFetchProblem(OK_URL, Buffer.from('<!doctype html><html>oops</html>'))).toMatch(
      /not a recognized image/,
    );
    expect(imageFetchProblem(OK_URL, Buffer.alloc(4))).toMatch(/not a recognized image/);
  });
  it('rejects oversized bodies (cover art is ~100KB)', () => {
    expect(imageFetchProblem(OK_URL, jpegBytes(11 * 1024 * 1024))).toMatch(/too large/);
    expect(imageFetchProblem(OK_URL, jpegBytes(10 * 1024 * 1024))).toBeNull();
  });
});

describe('artwork URL policy', () => {
  const ALLOWED = 'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded/cover.jpg';

  it('accepts the Spotify/Anchor artwork CDN host', () => {
    expect(artworkUrlProblem(ALLOWED)).toBeNull();
  });

  it('rejects unapproved artwork hosts before fetching', async () => {
    let called = false;
    await expect(
      fetchArtwork('https://img.example/cover.jpg', {
        fetchImpl: async () => {
          called = true;
          return new Response('', { status: 200 });
        },
      }),
    ).rejects.toThrow(/unapproved artwork host/);
    expect(called).toBe(false);
  });

  it('uses manual redirects and rejects artwork redirects', async () => {
    const calls: { url: string; redirect?: RequestRedirect }[] = [];
    await expect(
      fetchArtwork(ALLOWED, {
        fetchImpl: async (url, init) => {
          calls.push({ url: String(url), redirect: init?.redirect });
          return new Response('', {
            status: 302,
            headers: { location: 'https://d3t3ozftmdmh3i.cloudfront.net/other.jpg' },
          });
        },
      }),
    ).rejects.toThrow(/redirects are not allowed/);

    expect(calls).toEqual([{ url: ALLOWED, redirect: 'manual' }]);
  });
});

describe('validateParsedFeed', () => {
  it('accepts a valid parsed feed from the Spotify/Anchor hosts', () => {
    const feed = parseFeed(
      `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title><![CDATA[S]]></title>
<description><![CDATA[About]]></description>
<link>https://podcasters.spotify.com/pod/show/french-curiosity</link>
<itunes:image href="https://d3t3ozftmdmh3i.cloudfront.net/show.jpg"/>
<item><title>Episode</title><link>https://podcasters.spotify.com/pod/show/french-curiosity/episodes/e</link>
<enclosure url="https://anchor.fm/s/114e11cd8/podcast/play/1/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fa.mp3"/>
<itunes:image href="https://d3t3ozftmdmh3i.cloudfront.net/episode.jpg"/></item>
</channel></rss>`,
    );

    expect(() => validateParsedFeed(feed)).not.toThrow();
  });

  it('rejects a feed that would fail the build schema before writing JSON', () => {
    const feed = parseFeed(
      `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<description><![CDATA[About]]></description>
<item><title>Episode</title>
<enclosure url="https://anchor.fm/s/114e11cd8/podcast/play/1/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fa.mp3"/>
</item>
</channel></rss>`,
    );

    expect(feed.latest?.title).toBe('Episode');
    expect(() => validateParsedFeed(feed)).toThrow(/show\.title is required/);
  });

  it('rejects parsed artwork from unapproved hosts before mirroring', () => {
    const feed = parseFeed(SAMPLE);
    expect(() => validateParsedFeed(feed)).toThrow(/unapproved artwork host: img\.example/);
  });
});
