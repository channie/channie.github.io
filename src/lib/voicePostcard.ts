/* ============================================================
   voicePostcard — the Reading "voice postcard" island controller.

   A postcard with a real recording is server-rendered as a play control +
   an <audio preload="none"> (so no audio bytes load until play). This
   attaches the behaviour: play/pause, a waveform that fills left-to-right
   as it plays, reset on end, and "only one postcard plays at a time".
   Postcards without a recording are inert "soon" pills and carry no
   [data-audio], so they're skipped here.

   No DOM access at import time (only inside functions), so it's safe to
   import from Node for the tests. DOM behaviour is covered in
   voicePostcard.dom.test.ts (repo island convention, like player.ts).
   ============================================================ */

/** The postcard currently playing — paused when another one starts. */
let playing: HTMLAudioElement | null = null;

/** Wire every `[data-postcard]` with an `<audio>` under `root`. Idempotent. */
export function initVoicePostcards(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-postcard]').forEach((el) => {
    if (el.dataset.enhanced === 'true') return;
    if (!el.querySelector('[data-audio]')) return; // inert "soon" pill
    attachPostcard(el);
  });
}

function attachPostcard(rootEl: HTMLElement): void {
  const audio = rootEl.querySelector<HTMLAudioElement>('[data-audio]');
  const playBtn = rootEl.querySelector<HTMLElement>('[data-play]');
  if (!audio || !playBtn) return;
  const bars = [...rootEl.querySelectorAll<HTMLElement>('[data-wave] i')];

  const setPlaying = (p: boolean) => {
    rootEl.dataset.playing = String(p);
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play voice postcard');
  };

  const paint = () => {
    const d = audio.duration;
    const ratio = Number.isFinite(d) && d > 0 ? audio.currentTime / d : 0;
    const lit = Math.round(ratio * bars.length);
    bars.forEach((b, i) => b.classList.toggle('on', i < lit));
  };

  playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  });

  audio.addEventListener('play', () => {
    if (playing && playing !== audio) playing.pause();
    playing = audio;
    setPlaying(true);
  });
  audio.addEventListener('pause', () => {
    if (playing === audio) playing = null;
    setPlaying(false);
  });
  audio.addEventListener('timeupdate', paint);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    paint();
    setPlaying(false);
  });
  audio.addEventListener('error', () => setPlaying(false));

  setPlaying(false);
  rootEl.dataset.enhanced = 'true';
}
