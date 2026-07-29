// @vitest-environment jsdom
/* DOM-controller regression tests for initPlayers — the pure helpers are
   covered in player.test.ts, but every player bug so far has lived in the
   DOM wiring, so this exercises the real data-* contract that BOTH
   PodcastPlayer and PodcastBand render (play/pause, skip clamping, speed
   cycling, mute, progress updates, keyboard seeking, idempotency). */
import { describe, it, expect, vi } from 'vitest';
import { initPlayers, SKIP_BACK, SKIP_FWD } from './player';

interface Harness {
  root: HTMLElement;
  audio: HTMLAudioElement;
  q: (sel: string) => HTMLElement;
  click: (sel: string) => void;
  /** flush the microtask queue (audio.play() resolves a promise) */
  flush: () => Promise<void>;
}

/** Mount the shared player markup and stub the media APIs jsdom lacks. */
function mount({ duration = 600 } = {}): Harness {
  document.body.innerHTML = `
    <div data-player>
      <audio data-audio src="https://cdn.example/ep.mp3"></audio>
      <a data-play href="/podcast"></a>
      <button data-scrub role="slider" aria-valuenow="0"><i data-progress></i></button>
      <span data-cur>0:00</span><span data-dur>--:--</span>
      <button data-back></button>
      <button data-fwd></button>
      <button data-speed>1×</button>
      <button data-mute></button>
    </div>`;
  const root = document.querySelector<HTMLElement>('[data-player]')!;
  const audio = root.querySelector('audio')!;

  // jsdom's HTMLMediaElement has no real playback — emulate the contract.
  let time = 0;
  let paused = true;
  Object.defineProperty(audio, 'duration', { configurable: true, get: () => duration });
  Object.defineProperty(audio, 'currentTime', {
    configurable: true,
    get: () => time,
    set: (v: number) => {
      time = v;
    },
  });
  Object.defineProperty(audio, 'paused', { configurable: true, get: () => paused });
  audio.play = vi.fn(() => {
    paused = false;
    audio.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  audio.pause = vi.fn(() => {
    paused = true;
    audio.dispatchEvent(new Event('pause'));
  });

  initPlayers(document);

  const q = (sel: string) => root.querySelector<HTMLElement>(sel)!;
  return {
    root,
    audio,
    q,
    click: (sel) => q(sel).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    flush: () => Promise.resolve().then(() => Promise.resolve()),
  };
}

describe('initPlayers wiring', () => {
  it('marks the player enhanced and is idempotent (no double-binding)', async () => {
    const { root, audio, click, flush } = mount();
    expect(root.dataset.enhanced).toBe('true');
    initPlayers(document); // second pass must be a no-op
    click('[data-play]');
    await flush();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('toggles play/pause and mirrors it on data-playing', async () => {
    const { root, audio, click, flush } = mount();
    click('[data-play]');
    await flush();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(root.dataset.playing).toBe('true');
    click('[data-play]');
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(root.dataset.playing).toBe('false');
  });

  it('drops back to not-playing when play() rejects or the audio errors', async () => {
    const { root, audio, click, flush } = mount();
    audio.play = vi.fn(() => Promise.reject(new Error('blocked')));
    click('[data-play]');
    await flush();
    expect(root.dataset.playing).toBe('false');
    audio.dispatchEvent(new Event('error'));
    expect(root.dataset.playing).toBe('false');
  });

  it('skips ±, clamped into [0, duration]', () => {
    const { audio, click } = mount({ duration: 600 });
    click('[data-fwd]');
    expect(audio.currentTime).toBe(SKIP_FWD);
    audio.currentTime = 600 - 10;
    click('[data-fwd]');
    expect(audio.currentTime).toBe(600); // clamped at the end
    audio.currentTime = 5;
    click('[data-back]');
    expect(audio.currentTime).toBe(0); // clamped at the start
    audio.currentTime = 100;
    click('[data-back]');
    expect(audio.currentTime).toBe(100 - SKIP_BACK);
  });

  it('cycles playback speed and updates the label + aria-label', () => {
    const { audio, q, click } = mount();
    click('[data-speed]');
    expect(audio.playbackRate).toBe(1.25);
    expect(q('[data-speed]').textContent).toBe('1.25×');
    expect(q('[data-speed]').getAttribute('aria-label')).toContain('1.25×');
    click('[data-speed]');
    click('[data-speed]');
    click('[data-speed]'); // 1.5 → 2 → wraps to 1
    expect(audio.playbackRate).toBe(1);
    expect(q('[data-speed]').textContent).toBe('1×');
  });

  it('toggles mute with data-muted, aria-pressed and a swapped label', () => {
    const { root, audio, q, click } = mount();
    click('[data-mute]');
    expect(audio.muted).toBe(true);
    expect(root.dataset.muted).toBe('true');
    expect(q('[data-mute]').getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-mute]').getAttribute('aria-label')).toBe('Unmute');
    click('[data-mute]');
    expect(audio.muted).toBe(false);
    expect(q('[data-mute]').getAttribute('aria-label')).toBe('Mute');
  });

  it('mirrors timeupdate into progress width, time label and slider aria', () => {
    const { audio, q } = mount({ duration: 600 });
    audio.currentTime = 60;
    audio.dispatchEvent(new Event('timeupdate'));
    expect(q('[data-progress]').style.width).toBe('10%');
    expect(q('[data-cur]').textContent).toBe('1:00');
    expect(q('[data-scrub]').getAttribute('aria-valuenow')).toBe('10');
    expect(q('[data-scrub]').getAttribute('aria-valuetext')).toBe('1:00');
  });

  it('refines the total-time label on loadedmetadata', () => {
    const { audio, q } = mount({ duration: 600 });
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(q('[data-dur]').textContent).toBe('10:00');
  });

  it('seeks from the keyboard (arrows step, Home/End jump, all clamped)', () => {
    const { audio, q } = mount({ duration: 600 });
    const scrub = q('[data-scrub]');
    const key = (k: string) => scrub.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
    key('ArrowRight');
    expect(audio.currentTime).toBe(5);
    key('End');
    expect(audio.currentTime).toBe(600);
    key('Home');
    expect(audio.currentTime).toBe(0);
    key('ArrowLeft'); // 0 - 5 clamps to 0
    expect(audio.currentTime).toBe(0);
  });
});
