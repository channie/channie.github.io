/* VideoLoop enhancement controller — the island behaviour behind the
   <VideoLoop> feature component, extracted so it is unit-testable (see
   videoLoop.dom.test.ts), the same way initPlayers backs the podcast players.

   The component server-renders an ordinary <video controls> that works with
   no JS. This upgrades each clip to a muted, autoplaying loop that only runs
   while it is on screen, and sets data-enhanced (CSS reveals the JS-only
   look). It deliberately does NOT enhance under prefers-reduced-motion — an
   autoplaying loop is exactly the motion that setting asks us not to start —
   and it keeps responding if the user flips that OS setting mid-visit. */

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/* Each enhanced clip owns an IntersectionObserver; we keep the handle so
   un-enhancing (reduced motion turned on) can disconnect it. Without this the
   stale observer would keep driving play()/pause() on a reverted <video>. */
const observers = new WeakMap<HTMLVideoElement, IntersectionObserver>();

/** Upgrade one server-rendered `<video controls>` into an autoplaying loop
    that plays only while it is at least a quarter on screen. Idempotent. */
export function enhanceVideo(video: HTMLVideoElement): void {
  if (video.dataset.enhanced !== undefined) return;
  video.controls = false;
  video.preload = 'metadata';
  video.dataset.enhanced = '';

  // Only play while on screen — silent loops decoding off screen are wasted
  // work on a laptop battery.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      }
    },
    { threshold: 0.25 },
  );
  io.observe(video);
  observers.set(video, io);
}

/** Revert an enhanced clip to the no-JS `<video controls>` baseline. */
export function unenhanceVideo(video: HTMLVideoElement): void {
  if (video.dataset.enhanced === undefined) return;
  observers.get(video)?.disconnect();
  observers.delete(video);
  video.pause();
  video.controls = true;
  delete video.dataset.enhanced;
}

/** Wire every `.vloop video` under `root`, gated on prefers-reduced-motion,
    and keep it in sync if the user toggles that setting mid-visit. */
export function initVideoLoops(root: ParentNode = document): void {
  const media = window.matchMedia(REDUCED_MOTION);
  const videos = () => root.querySelectorAll<HTMLVideoElement>('.vloop video');
  const apply = () => videos().forEach(media.matches ? unenhanceVideo : enhanceVideo);

  apply();
  media.addEventListener('change', apply);
}
