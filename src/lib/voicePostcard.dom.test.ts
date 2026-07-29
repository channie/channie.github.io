// @vitest-environment jsdom
/* DOM-controller tests for initVoicePostcards — the Reading "voice postcard"
   island. Its value is behavioural (play/pause, the waveform fill, reset on
   end, and only-one-plays-at-a-time), so this exercises that contract against
   a stubbed <audio> (jsdom implements no real playback). */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initVoicePostcards } from './voicePostcard';

/** Mount one postcard and stub the <audio> the controller drives.
    `live: false` mounts the inert "soon" variant (no [data-audio]). */
function mount({ live = true, bars = 4, duration = 20 } = {}) {
  const barEls = Array.from({ length: bars }, () => '<i></i>').join('');
  document.body.innerHTML = `
    <div class="postcard" data-postcard>
      <button type="button" data-play></button>
      <span data-wave>${barEls}</span>
      ${live ? '<audio data-audio></audio>' : ''}
    </div>`;
  const root = document.querySelector<HTMLElement>('[data-postcard]')!;
  const playBtn = root.querySelector<HTMLElement>('[data-play]')!;
  const barNodes = [...root.querySelectorAll<HTMLElement>('[data-wave] i')];
  const audio = root.querySelector<HTMLAudioElement>('[data-audio]');
  if (audio) {
    let paused = true;
    let t = 0;
    Object.defineProperty(audio, 'paused', { get: () => paused, configurable: true });
    Object.defineProperty(audio, 'currentTime', {
      get: () => t,
      set: (v) => (t = v),
      configurable: true,
    });
    Object.defineProperty(audio, 'duration', { get: () => duration, configurable: true });
    audio.play = vi.fn(() => {
      paused = false;
      audio.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    audio.pause = vi.fn(() => {
      paused = true;
      audio.dispatchEvent(new Event('pause'));
    });
  }
  return { root, playBtn, barNodes, audio };
}

const lit = (bars: HTMLElement[]) => bars.map((b) => b.classList.contains('on'));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('initVoicePostcards', () => {
  it('enhances a postcard that has audio (data-enhanced, a Play label)', () => {
    const { root, playBtn } = mount();
    initVoicePostcards();
    expect(root.dataset.enhanced).toBe('true');
    expect(root.dataset.playing).toBe('false');
    expect(playBtn.getAttribute('aria-label')).toBe('Play voice postcard');
  });

  it('skips an inert "soon" pill with no audio', () => {
    const { root } = mount({ live: false });
    initVoicePostcards();
    expect(root.dataset.enhanced).toBeUndefined();
  });

  it('toggles play then pause on click', () => {
    const { playBtn, audio, root } = mount();
    initVoicePostcards();
    playBtn.click();
    expect(audio!.play).toHaveBeenCalledTimes(1);
    expect(root.dataset.playing).toBe('true');
    expect(playBtn.getAttribute('aria-label')).toBe('Pause');
    playBtn.click();
    expect(audio!.pause).toHaveBeenCalledTimes(1);
    expect(root.dataset.playing).toBe('false');
  });

  it('fills the waveform proportionally as it plays', () => {
    const { audio, barNodes } = mount({ bars: 4, duration: 20 });
    initVoicePostcards();
    audio!.currentTime = 10; // halfway
    audio!.dispatchEvent(new Event('timeupdate'));
    expect(lit(barNodes)).toEqual([true, true, false, false]);
  });

  it('resets time and clears the waveform when it ends', () => {
    const { audio, barNodes, root } = mount({ bars: 4, duration: 20 });
    initVoicePostcards();
    audio!.currentTime = 20;
    audio!.dispatchEvent(new Event('timeupdate'));
    expect(lit(barNodes)).toEqual([true, true, true, true]);
    audio!.dispatchEvent(new Event('ended'));
    expect(audio!.currentTime).toBe(0);
    expect(lit(barNodes)).toEqual([false, false, false, false]);
    expect(root.dataset.playing).toBe('false');
  });

  it('pauses the previous postcard when another starts (one at a time)', () => {
    document.body.innerHTML = `
      <div class="postcard" data-postcard><button type="button" data-play></button><span data-wave></span><audio data-audio id="a"></audio></div>
      <div class="postcard" data-postcard><button type="button" data-play></button><span data-wave></span><audio data-audio id="b"></audio></div>`;
    const stub = (audio: HTMLAudioElement) => {
      let paused = true;
      Object.defineProperty(audio, 'paused', { get: () => paused, configurable: true });
      Object.defineProperty(audio, 'duration', { get: () => 20, configurable: true });
      Object.defineProperty(audio, 'currentTime', { value: 0, writable: true, configurable: true });
      audio.play = vi.fn(() => {
        paused = false;
        audio.dispatchEvent(new Event('play'));
        return Promise.resolve();
      });
      audio.pause = vi.fn(() => {
        paused = true;
        audio.dispatchEvent(new Event('pause'));
      });
    };
    const a = document.querySelector<HTMLAudioElement>('#a')!;
    const b = document.querySelector<HTMLAudioElement>('#b')!;
    stub(a);
    stub(b);
    initVoicePostcards();
    a.play();
    b.play();
    expect(a.pause).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a second init does not double-wire the click', () => {
    const { playBtn, audio } = mount();
    initVoicePostcards();
    initVoicePostcards();
    playBtn.click();
    expect(audio!.play).toHaveBeenCalledTimes(1);
  });
});
