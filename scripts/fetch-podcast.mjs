/* ============================================================
   fetch-podcast.mjs — fetch Channie's podcast RSS feed (hosted on
   anchor.fm / Spotify for Podcasters), parse it, and write a
   committed snapshot to src/data/podcast-feed.json.

   The site build reads ONLY that JSON (never the network), so a feed
   outage can't break a deploy. Run this on a schedule (refresh.yml,
   Phase 9) so new episodes appear automatically:

     node scripts/fetch-podcast.mjs

   It exits non-zero on fetch/parse failure WITHOUT touching the JSON,
   so the last-good snapshot is preserved.
   ============================================================ */
import { writeFile, readFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const FEED_URL = 'https://anchor.fm/s/114e11cd8/podcast/rss';
const OUT = fileURLToPath(new URL('../src/data/podcast-feed.json', import.meta.url));
/* Script-managed mirror of the show/episode artwork. The site references ONLY
   these local copies (via src/lib/podcastImages.ts) — never the host CDN —
   so a page view makes no third-party requests and an image-CDN outage can't
   break the player. Everything in this directory is owned by this script. */
const IMG_DIR = fileURLToPath(new URL('../src/assets/podcast/', import.meta.url));
const UA = 'channie.org build (+https://channie.org)';
const ALLOWED_ARTWORK_HOSTS = new Set([
  // Spotify for Podcasters / Anchor artwork CDN in the current RSS snapshot.
  'd3t3ozftmdmh3i.cloudfront.net',
]);

const decode = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]).trim() : '';
};
const attrOf = (block, name, attr) => {
  const m = block.match(new RegExp(`<${name}\\b[^>]*\\b${attr}="([^"]*)"`, 'i'));
  return m ? m[1] : '';
};
/* Strips markup from ALREADY-DECODED text (tag() decodes; decoding again
   here would mangle genuinely double-encoded entities like `&amp;amp;`). */
const stripHtml = (text = '') =>
  text
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/Powered by Firstory Hosting/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

/* itunes:duration is either total seconds ("1926") or a clock string
   ("HH:MM:SS" / "MM:SS") depending on the host — parse both to seconds. */
const durationSeconds = (raw = '') => {
  const s = String(raw).trim();
  if (!s) return 0;
  if (s.includes(':')) {
    return s.split(':').reduce((acc, part) => acc * 60 + (parseInt(part, 10) || 0), 0);
  }
  return parseInt(s, 10) || 0;
};
const fmtDuration = (sec) => {
  sec = parseInt(sec, 10) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
};
const fmtMinutes = (sec) => `${Math.max(1, Math.round((parseInt(sec, 10) || 0) / 60))} min`;
const fmtDate = (rfc) => {
  const d = new Date(rfc);
  if (isNaN(d.getTime())) return { iso: '', label: '' };
  return {
    iso: d.toISOString(),
    label: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d),
  };
};

function httpsUrl(raw = '') {
  const value = String(raw).trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function artworkUrlProblem(raw = '') {
  const value = String(raw).trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return 'not an https URL';
    if (!ALLOWED_ARTWORK_HOSTS.has(url.hostname.toLowerCase())) {
      return `unapproved artwork host: ${url.hostname}`;
    }
    return null;
  } catch {
    return 'unparsable URL';
  }
}

function assertAllowedArtworkUrl(raw = '') {
  const problem = artworkUrlProblem(raw);
  if (problem) throw new Error(problem);
  return new URL(raw);
}

/* Local ASCII-safe filename for a remote image URL — content-addressed by the
   URL, so an unchanged URL reuses its file and a rotated URL becomes a new one.
   (ASCII matters: non-ASCII asset filenames break the production build.) */
function imageFileName(url) {
  url = httpsUrl(url);
  if (!url) return null;
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 12);
  let ext = '.jpg';
  const m = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif|gif)$/i);
  if (m) ext = m[0].toLowerCase();
  return `${hash}${ext}`;
}

/* Cover art is ~100KB; anything past this is not a cover. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/* Identify an image by its leading bytes. Content-type is unreliable here —
   the anchor.fm CDN serves genuine JPEGs as application/octet-stream — so we
   sniff the magic number instead of trusting the header. */
function isKnownImage(buf) {
  if (!buf || buf.byteLength < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  // RIFF....WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  // ISO-BMFF (AVIF / HEIF): "....ftyp"
  if (buf.toString('ascii', 4, 8) === 'ftyp') return true;
  return false;
}

/* Why a mirrored download is rejected, or null when it's acceptable.
   The refresh cron COMMITS what this writes, so refuse junk at the door: https
   URLs only, actual image bytes (sniffed, not header-trusted), and a size cap. */
function imageFetchProblem(url, body) {
  try {
    if (new URL(url).protocol !== 'https:') return 'not an https URL';
  } catch {
    return 'unparsable URL';
  }
  if (body.byteLength > MAX_IMAGE_BYTES) return `too large (${body.byteLength} bytes)`;
  if (!isKnownImage(body)) return 'not a recognized image (bad magic bytes)';
  return null;
}

async function fetchArtwork(url, { signal, fetchImpl = fetch } = {}) {
  const allowedUrl = assertAllowedArtworkUrl(url);
  const res = await fetchImpl(allowedUrl, {
    signal,
    redirect: 'manual',
    headers: { 'user-agent': UA },
  });
  if (res.status >= 300 && res.status < 400) throw new Error('artwork redirects are not allowed');
  return res;
}

async function readBodyWithLimit(res, limit) {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) throw new Error(`too large (${total} bytes)`);
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function downloadImage(url, file) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetchArtwork(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await readBodyWithLimit(res, MAX_IMAGE_BYTES);
    const problem = imageFetchProblem(url, body);
    if (problem) throw new Error(problem);
    await writeFile(join(IMG_DIR, file), body);
  } finally {
    clearTimeout(timer);
  }
}

/* Mirror the artwork into IMG_DIR and stamp each record with its local
   `imageFile`. A failed download falls back to a previously-mirrored copy if
   one exists, else null (the UI then falls back to the committed show logo) —
   so like the JSON snapshot, the last-good state is always preserved. */
async function mirrorImages(parsed) {
  await mkdir(IMG_DIR, { recursive: true });
  const have = new Set(await readdir(IMG_DIR));
  const urls = [...new Set([parsed.show.image, ...parsed.episodes.map((e) => e.image)])].filter(Boolean);

  const fileOf = new Map();
  for (const url of urls) {
    const file = imageFileName(url);
    if (!have.has(file)) {
      try {
        await downloadImage(url, file);
        have.add(file);
        console.log(`[podcast] image mirrored → ${file}`);
      } catch (err) {
        console.warn(`[podcast] image fetch failed (${err.message}): ${url}`);
      }
    }
    fileOf.set(url, have.has(file) ? file : null);
  }

  parsed.show.imageFile = fileOf.get(parsed.show.image) ?? null;
  // `latest` is episodes[0] by reference, so it picks the field up too.
  for (const ep of parsed.episodes) ep.imageFile = fileOf.get(ep.image) ?? null;

  // Prune mirrored files no longer referenced by any episode.
  const referenced = new Set([...fileOf.values()].filter(Boolean));
  for (const f of have) {
    if (!referenced.has(f)) {
      await unlink(join(IMG_DIR, f));
      console.log(`[podcast] pruned stale image ${f}`);
    }
  }
}

function parseFeed(xml) {
  const channelOnly = xml.split('<item>')[0];
  const show = {
    title: tag(channelOnly, 'title'),
    description: stripHtml(tag(channelOnly, 'description')),
    image: httpsUrl(attrOf(channelOnly, 'itunes:image', 'href')),
    link: httpsUrl(tag(channelOnly, 'link')),
  };
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const episodes = items
    .map((block) => {
      const sec = durationSeconds(tag(block, 'itunes:duration'));
      const { iso, label } = fmtDate(tag(block, 'pubDate'));
      const audioUrl = httpsUrl(attrOf(block, 'enclosure', 'url'));
      const pageUrl = httpsUrl(tag(block, 'link')) || audioUrl;
      const image = httpsUrl(attrOf(block, 'itunes:image', 'href')) || show.image;
      return {
        title: tag(block, 'title'),
        description: stripHtml(tag(block, 'description')),
        date: iso,
        dateLabel: label,
        durationSeconds: sec,
        duration: fmtDuration(sec),
        minutes: fmtMinutes(sec),
        audioUrl,
        pageUrl,
        number: parseInt(tag(block, 'itunes:episode'), 10) || null,
        image,
      };
    })
    .filter((e) => e.title && e.audioUrl && e.pageUrl)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return { show, latest: episodes[0] || null, episodes, fetchedAt: new Date().toISOString() };
}

function parsedFeedProblems(feed) {
  const problems = [];
  if (!feed.show.title.trim()) problems.push('show.title is required');
  if (!feed.latest) problems.push('at least one valid episode is required');
  if (!feed.episodes.length) problems.push('episodes must not be empty');
  if (feed.show.link && !httpsUrl(feed.show.link)) problems.push('show.link must be HTTPS when present');

  const showImageProblem = artworkUrlProblem(feed.show.image);
  if (showImageProblem) problems.push(`show.image ${showImageProblem}`);

  feed.episodes.forEach((ep, index) => {
    const label = `episodes[${index}]`;
    if (!ep.title.trim()) problems.push(`${label}.title is required`);
    if (!httpsUrl(ep.audioUrl)) problems.push(`${label}.audioUrl must be HTTPS`);
    if (!httpsUrl(ep.pageUrl)) problems.push(`${label}.pageUrl must be HTTPS`);
    const imageProblem = artworkUrlProblem(ep.image);
    if (imageProblem) problems.push(`${label}.image ${imageProblem}`);
  });
  return problems;
}

function validateParsedFeed(feed) {
  const problems = parsedFeedProblems(feed);
  if (problems.length) throw new Error(`invalid podcast feed: ${problems.join('; ')}`);
  return feed;
}

async function main() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  let xml;
  try {
    const res = await fetch(FEED_URL, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'channie.org build (+https://channie.org)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const parsed = parseFeed(xml);
  validateParsedFeed(parsed);

  await mirrorImages(parsed);
  validateParsedFeed(parsed);

  // Only rewrite when episode data actually changed (keeps git history quiet).
  let prev = '';
  try {
    prev = await readFile(OUT, 'utf8');
  } catch {
    /* first run */
  }
  const next = JSON.stringify(parsed, null, 2) + '\n';
  const strip = (s) => s.replace(/"fetchedAt":\s*"[^"]*"/, '');
  if (strip(prev) === strip(next)) {
    console.log('[podcast] feed unchanged — snapshot kept');
    return;
  }
  await writeFile(OUT, next);
  console.log(`[podcast] wrote ${parsed.episodes.length} episodes → ${OUT}`);
}

// Exported for unit tests; runs the fetch only when invoked directly.
export { parseFeed, imageFileName, imageFetchProblem, artworkUrlProblem, fetchArtwork, validateParsedFeed };

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error('[podcast] fetch failed (snapshot preserved):', err.message);
    process.exit(1);
  });
}
