/* ============================================================
   heroImage — ONE source of truth for the homepage hero photo and
   its responsive config, shared by two places that must agree:

   - `components/Hero.astro` renders the <Picture>;
   - `pages/index.astro` emits the <head> preload (BaseLayout's
     `preloadImage` prop).

   They have to describe the SAME candidate set: a preload whose
   srcset/sizes differ from the rendered <picture> makes the browser
   fetch a second file instead of reusing the preloaded one, which
   is slower than having no preload at all. Hence the shared consts.
   ============================================================ */
import { getImage } from 'astro:assets';
import heroImg from '../assets/images/hero.jpg';

export { heroImg };

/** Candidate widths emitted for the hero, smallest to largest. */
export const HERO_WIDTHS = [768, 1280, 1920, 2400];

/** The hero is full-bleed, so the candidate picked is the viewport width. */
export const HERO_SIZES = '100vw';

/** Preload format. AVIF is the smallest and the first <source> in the
    <Picture>; `type` on the preload link keeps browsers without AVIF
    support from acting on it (they fetch webp/jpeg as usual). */
export const HERO_PRELOAD_TYPE = 'image/avif';

/**
 * The AVIF srcset string for the `<head>` preload — built with the same
 * widths the <Picture> renders, so the preloaded file is the one used.
 */
export async function heroPreloadSrcset(): Promise<string> {
  const avif = await getImage({
    src: heroImg,
    format: 'avif',
    widths: HERO_WIDTHS,
    sizes: HERO_SIZES,
  });
  return avif.srcSet.attribute;
}
