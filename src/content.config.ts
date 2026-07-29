/* ============================================================
   Content collections (Astro Content Layer API).

   These schemas are the SAFETY NET for content edits: anything that
   doesn't match (a missing required field, a typo'd field name, a bad
   date / hex colour / URL) fails the build with a clear message, so a
   mistake is caught locally instead of shipping broken. Content is
   folder-per-entry under src/content/<collection>/<slug>/.

   Conventions:
   - `.strict()` on every object → an unknown/misspelled key (e.g.
     `heorWidth`, `Titel`) is an ERROR, not silently ignored.
   - Collections: experiments (blog), books (Reading flip), listening
     (shows). Each is one folder/file per item under src/content/<name>/.
   ============================================================ */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** 6-digit hex colour like "#b92a0f" (quote it in YAML so it isn't a comment). */
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour like "#b92a0f" (quote it in YAML)');

/** A full URL (http/https) — catches a missing protocol or a typo'd link. */
const httpUrl = z.url({ error: 'must be a full URL, e.g. https://…' });

/* Experiments — the blog. One FOLDER per post:
   src/content/experiments/<slug>/index.md (+ co-located images).
   `.md` by default; rename to `.mdx` for <Figure>/<YouTube> (the glob
   matches both, so renaming never makes a post silently disappear). */
const experiments = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/experiments' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        /** publish date, YYYY-MM-DD */
        date: z.coerce.date(),
        /** free-form tag shown above the title, e.g. "Tools & Language" */
        category: z.string(),
        /** 1–2 sentences shown in the list + used as the meta description */
        excerpt: z.string(),
        /** estimated reading time, e.g. "6 min" */
        read: z.string().optional(),
        /** hero image: a co-located `./file` (or a shared `../../../assets/...`) */
        hero: image().optional(),
        /** hero display width in px (default 460; 160–720) */
        heroWidth: z.number().int().min(160).max(720).optional(),
        /** hero alt text. Set it when the hero conveys information (a
            screenshot, a diagram); omit for a purely atmospheric image and
            it renders decorative (alt=""). */
        heroAlt: z.string().optional(),
        /** Presentation. 'standard' is the default single-column post.
            'feature' opts into the magazine feature layout (full-bleed
            masthead, narrow measure, drop cap, breakout figures).
            NOTE: this field is deliberately NOT called `layout` — `layout`
            is a RESERVED frontmatter key in MDX (Astro resolves it as a
            component path), so `layout: feature` fails the build with
            "Rollup failed to resolve import feature". Don't rename it back. */
        presentation: z.enum(['standard', 'feature']).default('standard'),
        /** feature only: the small uppercase line above the headline,
            e.g. "First Person · On Snow" */
        kicker: z.string().optional(),
        /** feature only: the standfirst under the headline. One or two
            sentences, written a step cooler than the body copy. */
        deck: z.string().optional(),
        /** feature only: credit line under the deck, e.g.
            "Words and photographs by Channie Wu" */
        byline: z.string().optional(),
        /** mark exactly one post featured; otherwise the newest is */
        featured: z.boolean().default(false),
        /** true hides the post from the site */
        draft: z.boolean().default(false),
      })
      .strict(),
});

/* One structured entry on a book's "spread". Three kinds:
   - quote: an excerpt (`text`), optionally a "voice postcard" (`narration`
     is the full read-aloud passage; `audioFile` points at the recording —
     its duration is read from the file at build, never hard-coded) and a
     reflection (`thought`);
   - note: a free-standing note in Channie's voice;
   - rubric: a quiet small-caps section header within a spread (e.g. the
     "Night" / "The Accident" parts of a collection) — not a quote/note.
   For a non-English book, `textEn` is a loose English translation, shown
   quietly under the primary line (the Listening page's *En convention). */
const bookEntry = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('quote'),
      /** the excerpt shown on the card (primary language). Authored
          paragraphs are kept wherever the quote sits — write `text: >` and
          leave a blank line between them. */
      text: z.string(),
      /** loose English translation of the excerpt (for a non-English book);
          paragraphed the same way as `text` */
      textEn: z.string().optional(),
      /** a phrase WITHIN `text` to strike in accent colour — the line the
          excerpt turns on. Must appear in `text` verbatim (the build fails
          loudly if it doesn't, so an edit can't silently drop it).
          Honoured on an ordinary quote and on a `passage`, not on a `coda`. */
      emphasis: z.string().optional(),
      /** the full passage read aloud — its presence marks a voice postcard */
      narration: z.string().optional(),
      /** recording for the postcard, co-located & relative, e.g.
          "./audio/mirror.mp3". Its duration is read from the file at build;
          when the file is absent the postcard shows an inert "soon" pill. */
      audioFile: z.string().optional(),
      /** an optional reflection shown under the quote */
      thought: z.string().optional(),
      /** make this quote the spread's ENDING — a hairline above and a ✦
          beneath, either way. Two shapes, named for the text they suit:
          - 'coda': a short beat, centred with each sentence on its own line;
          - 'passage': a longer excerpt, left-aligned as prose.
          A closing quote is text-only (no postcard/thought). */
      closing: z.enum(['coda', 'passage']).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('note'),
      text: z.string(),
      /** loose English translation of the note (for a non-English book) */
      textEn: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('rubric'),
      /** the section label, e.g. "Night" */
      text: z.string(),
    })
    .strict(),
]);

/* Books — the Reading "magazine flip". One FOLDER per book
   (src/content/books/<slug>/index.md), so a book's cover photo + voice-
   postcard recordings are co-located content that move/rename with it. */
const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        author: z.string(),
        /** primary language of the book's content. 'zh' sets the spread's
            `lang` and renders CJK text upright (WenKai has no true italic). */
        lang: z.enum(['en', 'zh']).default('en'),
        /** cover backdrop + the generated-cover colour; also the fallback
            when no `cover` photo is set. 6-digit hex, quoted. */
        color: hexColor,
        /** co-located cover photo (./cover.jpg). When set → photo cover;
            when omitted → the generated colour+type block. */
        cover: image().optional(),
        /** alt text for the cover photo (describe it; used in photo mode) */
        coverAlt: z.string().optional(),
        /** sort order in the flip (ascending) */
        order: z.number().int().default(0),
        /** one-line reason it stuck with you */
        blurb: z.string().optional(),
        /** loose English translation of the blurb (for a non-English book) */
        blurbEn: z.string().optional(),
        entries: z.array(bookEntry).default([]),
        /** true hides the book */
        draft: z.boolean().default(false),
      })
      .strict(),
});

/* Listening — one FOLDER per show (src/content/listening/<slug>/index.md):
   the cover logo is co-located, the recommended episodes are frontmatter,
   and the body Markdown is the "notes" journal blurb (may be empty; shown
   on the detail page). The LISTING page is a "field notes" diary — the
   memo/when/cap fields below feed its taped-photo entries. Chinese shows
   carry the *En twins so the diary can trail a loose English translation. */
const listening = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/listening' }),
  schema: ({ image }) =>
    z
      .object({
        kind: z.enum(['Podcast', 'YouTube']),
        title: z.string(),
        /** the creator/network, e.g. "The New York Times" */
        by: z.string().optional(),
        /** English credit for a Chinese show (the diary's credit line is
            always readable to non-Chinese visitors) */
        byEn: z.string().optional(),
        /** "listen on" link(s) — a single full URL, or a YAML list of them
            (e.g. Spotify + Apple Podcasts). Normalized to an array; each
            platform's name + icon are derived from its hostname. */
        url: z.preprocess(
          (v) => (Array.isArray(v) ? v : [v]),
          z.array(httpUrl).min(1, { error: 'add at least one listen link (a full URL)' }),
        ),
        /** the show's language: 'zh' (中文) or 'en' */
        lang: z.enum(['zh', 'en']),
        /** co-located square cover logo */
        logo: image().optional(),
        /** fallback tile colour when there's no logo */
        color: hexColor.optional(),
        /** diary "↻" eyebrow — ALWAYS English (even for zh shows): a situation
            ("Mid-decision") or a why-I-return ("To lift smarter"), never a
            schedule/frequency */
        whenEyebrow: z.string().optional(),
        /** the short handwritten diary memo on the listing page (native
            language; the longer letter stays in the Markdown body) */
        memo: z.string().optional(),
        /** loose, poetic English translation of a Chinese `memo` */
        memoEn: z.string().optional(),
        /** handwritten caption in the taped photo's bottom margin
            (e.g. "讀書會", "trevor :)") */
        cap: z.string().optional(),
        /** recommended single episodes, shown on the detail page */
        episodes: z
          .array(z.object({ title: z.string(), url: httpUrl }).strict())
          .default([]),
        /** show the "— Channie" sign-off under the note (default on; false hides it) */
        signed: z.boolean().default(true),
        /** true hides the show */
        draft: z.boolean().default(false),
      })
      .strict(),
});

export const collections = { experiments, books, listening };
