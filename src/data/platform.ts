/* ============================================================
   Platform detection for listening links — maps a URL to a
   platform name, an icon slug, and a language-aware "listen on"
   button label. Used by the Listening detail pages.

   Matches on the URL's HOSTNAME (e.g. podcasts.apple.com), not a
   substring of the whole URL — `example.com/apple-pie` is just a
   link, not Apple Podcasts.
   ============================================================ */
export type PlatformSlug = 'spotify' | 'apple' | 'youtube' | 'soundon' | 'link';

export interface Platform {
  /** display name, e.g. "Apple Podcasts" */
  name: string;
  /** icon slug for <Icon name={`platform-${slug}`} /> */
  slug: PlatformSlug;
  /** button verb, e.g. "在 Spotify 收聽" / "Listen on Spotify" */
  verb: string;
}

/** True when `host` is `domain` or a subdomain of it. */
const hostIs = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

export function platform(url: string, lang: 'zh' | 'en' = 'zh'): Platform {
  const zh = lang === 'zh';

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    /* not a parsable URL → generic link below */
  }

  if (hostIs(host, 'spotify.com'))
    return { name: 'Spotify', slug: 'spotify', verb: zh ? '在 Spotify 收聽' : 'Listen on Spotify' };
  if (hostIs(host, 'apple.com'))
    return {
      name: 'Apple Podcasts',
      slug: 'apple',
      verb: zh ? '在 Apple Podcasts 收聽' : 'Listen on Apple Podcasts',
    };
  if (hostIs(host, 'youtube.com') || hostIs(host, 'youtu.be'))
    return { name: 'YouTube', slug: 'youtube', verb: zh ? '在 YouTube 觀看' : 'Watch on YouTube' };
  if (hostIs(host, 'soundon.fm'))
    return { name: 'SoundOn', slug: 'soundon', verb: zh ? '在 SoundOn 收聽' : 'Listen on SoundOn' };

  return { name: zh ? '節目主頁' : 'Show page', slug: 'link', verb: zh ? '前往節目主頁' : 'Visit show page' };
}
