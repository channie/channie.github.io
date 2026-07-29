// @vitest-environment jsdom
/* DOM-controller tests for initVideoLoops — the <VideoLoop> island. The whole
   value of the component is behavioural (progressive enhancement, the
   reduced-motion gate, and pausing off screen), so this exercises that
   contract against stubbed matchMedia / IntersectionObserver / media APIs
   that jsdom doesn't implement. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initVideoLoops, enhanceVideo, unenhanceVideo } from './videoLoop';

/** A controllable prefers-reduced-motion media query. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
    /** flip the setting the way an OS toggle would, firing 'change' */
    set(v: boolean) {
      mql.matches = v;
      listeners.forEach((cb) => cb());
    },
  };
  window.matchMedia = vi.fn(() => mql as unknown as MediaQueryList);
  return mql;
}

/** IntersectionObserver stub — jsdom has none. Records instances so a test can
    drive the callback, and tracks observe/disconnect for cleanup assertions. */
class MockIO {
  static instances: MockIO[] = [];
  cb: IntersectionObserverCallback;
  observed = new Set<Element>();
  disconnected = false;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    MockIO.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
    this.disconnected = true;
  }
  /** simulate the element crossing the viewport threshold */
  fire(isIntersecting: boolean) {
    this.cb(
      [...this.observed].map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

/** Mount one .vloop clip and stub the playback the controller drives. */
function mount() {
  document.body.innerHTML = `<figure class="vloop"><video controls></video></figure>`;
  const video = document.querySelector<HTMLVideoElement>('.vloop video')!;
  video.play = vi.fn(() => Promise.resolve());
  video.pause = vi.fn();
  return video;
}

beforeEach(() => {
  MockIO.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIO);
});

describe('initVideoLoops', () => {
  it('enhances the clip when motion is allowed (controls off, data-enhanced, observed)', () => {
    stubMatchMedia(false);
    const video = mount();
    initVideoLoops();
    expect(video.controls).toBe(false);
    expect(video.dataset.enhanced).toBe('');
    expect(video.preload).toBe('metadata');
    expect(MockIO.instances).toHaveLength(1);
    expect(MockIO.instances[0].observed.has(video)).toBe(true);
  });

  it('plays only while on screen', () => {
    stubMatchMedia(false);
    const video = mount();
    initVideoLoops();
    const io = MockIO.instances[0];
    io.fire(true);
    expect(video.play).toHaveBeenCalledTimes(1);
    io.fire(false);
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('does NOT enhance under prefers-reduced-motion (stays a plain controls video)', () => {
    stubMatchMedia(true);
    const video = mount();
    initVideoLoops();
    expect(video.controls).toBe(true);
    expect(video.dataset.enhanced).toBeUndefined();
    expect(MockIO.instances).toHaveLength(0);
  });

  it('is idempotent — a second init does not double-observe', () => {
    stubMatchMedia(false);
    mount();
    initVideoLoops();
    initVideoLoops();
    expect(MockIO.instances).toHaveLength(1);
  });

  it('reverts when motion is disabled mid-visit, and disconnects the observer', () => {
    const mql = stubMatchMedia(false);
    const video = mount();
    initVideoLoops();
    const io = MockIO.instances[0];

    mql.set(true); // user turns reduced-motion ON
    expect(video.controls).toBe(true);
    expect(video.dataset.enhanced).toBeUndefined();
    expect(io.disconnected).toBe(true);

    // the stale observer must no longer be able to drive playback
    (video.play as ReturnType<typeof vi.fn>).mockClear();
    io.fire(true);
    expect(video.play).not.toHaveBeenCalled();
  });

  it('re-enhances when motion is re-enabled mid-visit', () => {
    const mql = stubMatchMedia(false);
    const video = mount();
    initVideoLoops();
    mql.set(true);
    mql.set(false); // back to motion allowed
    expect(video.controls).toBe(false);
    expect(video.dataset.enhanced).toBe('');
    // a fresh observer for the re-enhanced clip
    expect(MockIO.instances.at(-1)!.observed.has(video)).toBe(true);
  });
});

describe('enhanceVideo / unenhanceVideo guards', () => {
  it('enhanceVideo is a no-op on an already-enhanced clip', () => {
    stubMatchMedia(false);
    const video = mount();
    enhanceVideo(video);
    enhanceVideo(video);
    expect(MockIO.instances).toHaveLength(1);
  });

  it('unenhanceVideo is a no-op on a clip that was never enhanced', () => {
    const video = mount();
    unenhanceVideo(video);
    expect(video.controls).toBe(true);
    expect(video.pause).not.toHaveBeenCalled();
  });
});
