/* ============================================================
   Shared podcast-player logic.

   Pure helpers (formatTime / clampTime / seekRatio / cycleSpeed) are
   unit-tested in player.test.ts. `initPlayers` is the DOM controller used
   by BOTH the Podcast page player and the homepage band — they share the
   same `data-*` hooks, so the behaviour stays identical in one place.

   No DOM access happens at import time (only inside functions), so this
   module is safe to import from Node for the tests.
   ============================================================ */

export const SKIP_BACK = 15;
export const SKIP_FWD = 30;
export const SPEEDS = [1, 1.25, 1.5, 2] as const;

/** Format seconds as `m:ss` (or `h:mm:ss` past an hour). Safe for NaN/∞/negative. */
export function formatTime(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Clamp a target time into [0, duration]. If duration is unknown, only floor at 0. */
export function clampTime(t: number, duration: number): number {
  if (!Number.isFinite(t)) return 0;
  const lo = Math.max(0, t);
  return Number.isFinite(duration) && duration > 0 ? Math.min(lo, duration) : lo;
}

/** 0..1 position of `clientX` within a track spanning [left, left+width]. */
export function seekRatio(clientX: number, left: number, width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.min(1, Math.max(0, (clientX - left) / width));
}

/** Next playback rate in the cycle (wraps; falls back to the first entry). */
export function cycleSpeed(current: number, speeds: readonly number[] = SPEEDS): number {
  if (speeds.length === 0) return current;
  const i = speeds.indexOf(current);
  return speeds[(i + 1) % speeds.length];
}

/** Wire every `[data-player]` under `root` to its `<audio>`. Idempotent. */
export function initPlayers(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-player]').forEach((el) => {
    if (el.dataset.enhanced === 'true') return;
    attachPlayer(el);
  });
}

function attachPlayer(rootEl: HTMLElement): void {
  const audio = rootEl.querySelector<HTMLAudioElement>('[data-audio]');
  if (!audio) return;

  const $ = <T extends HTMLElement>(sel: string) => rootEl.querySelector<T>(sel);
  const playBtn = $('[data-play]');
  const scrub = $('[data-scrub]');
  const progress = $<HTMLElement>('[data-progress]');
  const curEl = $('[data-cur]');
  const durEl = $('[data-dur]');
  const back = $('[data-back]');
  const fwd = $('[data-fwd]');
  const speedBtn = $('[data-speed]');
  const muteBtn = $('[data-mute]');

  const setPlaying = (p: boolean) => {
    rootEl.dataset.playing = String(p);
  };

  // ---- play / pause ----
  playBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  });
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('error', () => setPlaying(false));

  // ---- time / progress ----
  audio.addEventListener('loadedmetadata', () => {
    if (durEl && Number.isFinite(audio.duration)) durEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    const d = audio.duration;
    const pct = Number.isFinite(d) && d > 0 ? (audio.currentTime / d) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (curEl) curEl.textContent = formatTime(audio.currentTime);
    if (scrub) {
      scrub.setAttribute('aria-valuenow', String(Math.round(pct)));
      scrub.setAttribute('aria-valuetext', formatTime(audio.currentTime));
    }
  });

  // ---- scrubber: click / drag / keyboard ----
  const seekTo = (clientX: number) => {
    if (!scrub) return;
    const r = scrub.getBoundingClientRect();
    const ratio = seekRatio(clientX, r.left, r.width);
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = ratio * audio.duration;
  };
  let dragging = false;
  const endDrag = () => {
    dragging = false;
  };
  scrub?.addEventListener('pointerdown', (e) => {
    dragging = true;
    try {
      scrub.setPointerCapture(e.pointerId);
    } catch {
      /* not all environments support capture */
    }
    seekTo(e.clientX);
  });
  scrub?.addEventListener('pointermove', (e) => {
    if (dragging) seekTo(e.clientX);
  });
  scrub?.addEventListener('pointerup', endDrag);
  scrub?.addEventListener('pointercancel', endDrag);
  scrub?.addEventListener('keydown', (e) => {
    const d = audio.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    let t: number | null = null;
    if (e.key === 'ArrowLeft') t = audio.currentTime - 5;
    else if (e.key === 'ArrowRight') t = audio.currentTime + 5;
    else if (e.key === 'Home') t = 0;
    else if (e.key === 'End') t = d;
    if (t !== null) {
      audio.currentTime = clampTime(t, d);
      e.preventDefault();
    }
  });

  // ---- skip ----
  back?.addEventListener('click', () => {
    audio.currentTime = clampTime(audio.currentTime - SKIP_BACK, audio.duration);
  });
  fwd?.addEventListener('click', () => {
    audio.currentTime = clampTime(audio.currentTime + SKIP_FWD, audio.duration);
  });

  // ---- speed ----
  speedBtn?.addEventListener('click', () => {
    const next = cycleSpeed(audio.playbackRate, SPEEDS);
    audio.playbackRate = next;
    const label = `${next}×`;
    speedBtn.textContent = label;
    speedBtn.setAttribute('aria-label', `Playback speed: ${label}`);
  });

  // ---- mute ----
  muteBtn?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    rootEl.dataset.muted = String(audio.muted);
    muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
    muteBtn.setAttribute('aria-pressed', String(audio.muted));
  });

  rootEl.dataset.enhanced = 'true';
}
