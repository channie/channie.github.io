/* ============================================================
   bookAudio — build-time resolver for a book's voice-postcard audio.

   Reading-page recordings live co-located in the content folder
   (src/content/books/<book>/audio/*.mp3). At BUILD this module:
     • maps each co-located file to its emitted (hashed) URL via Vite's
       import.meta.glob(?url) — so the browser fetches audio ONLY when a
       postcard is played, never at page load; and
     • reads each file's real duration with music-metadata (a pure-JS
       parser, a devDependency — it never ships to the client) and formats
       it "M:SS".

   getBookAudio() returns { url, duration } for a book + relative path, or
   null when the file isn't present yet (the postcard renders its inert
   "soon" state). Duration is resolved at build, so displaying it costs the
   client zero bytes and zero JS.

   Only formatDuration touches no I/O; it's unit-tested in bookAudio.test.ts.
   ============================================================ */
import { join } from 'node:path';
import { parseFile } from 'music-metadata';

/** Emitted (hashed) URLs for every co-located book audio file, keyed by its
    project-root-relative path (e.g. "/src/content/books/x/audio/y.mp3"). */
const urlMap = import.meta.glob('/src/content/books/**/*.{mp3,m4a,aac}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Repo root. Use the working directory (astro dev/build and vitest all run
    from the project root) — NOT import.meta.url, which Vite rewrites when it
    bundles this module for the SSR build, breaking the on-disk path. */
const projectRoot = process.cwd();

/** seconds → "M:SS" (24 → "0:24", 95 → "1:35"), rounded to the nearest
    second. Minutes are not zero-padded and may exceed 59. */
export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Resolve a book's `audioFile` ("./audio/x.mp3") to its root-relative key. */
function keyFor(bookId: string, audioFile: string): string {
  // bookId is the loader id, e.g. "the-night-trilogy/index" — drop "/index".
  const dir = bookId.replace(/\/index$/, '');
  const rel = audioFile.replace(/^\.\//, '');
  return `/src/content/books/${dir}/${rel}`;
}

const durationCache = new Map<string, string | null>();

async function durationForKey(key: string): Promise<string | null> {
  const cached = durationCache.get(key);
  if (cached !== undefined) return cached;
  let out: string | null = null;
  try {
    const { format } = await parseFile(join(projectRoot, key.replace(/^\//, '')));
    if (format.duration) out = formatDuration(format.duration);
  } catch {
    out = null; // unreadable / missing → degrade to the "soon" pill
  }
  durationCache.set(key, out);
  return out;
}

export interface BookAudio {
  /** emitted URL for <audio src> (the file loads only on play) */
  url: string;
  /** "M:SS" read from the real file, or null if it couldn't be read */
  duration: string | null;
}

/** The served URL + real duration for a book's audio file, or null when the
    file isn't present yet (→ the postcard renders its inert "soon" state). */
export async function getBookAudio(
  bookId: string,
  audioFile: string,
): Promise<BookAudio | null> {
  const key = keyFor(bookId, audioFile);
  const url = urlMap[key];
  if (!url) return null;
  return { url, duration: await durationForKey(key) };
}
