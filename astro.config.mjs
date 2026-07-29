// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';

import { isNoindexPage } from './src/data/seo.ts';
import { cjkSubset } from './scripts/subset-cjk.mjs';
import { pruneUnreferencedAssets } from './scripts/prune-assets.mjs';

// Channie.org — static personal site.
// User-site GitHub Pages repo (channie.github.io) + custom domain channie.org,
// so the site is served at the domain root: base stays '/'.
export default defineConfig({
  site: 'https://channie.org',

  // base: '/', // default — explicit for clarity; the custom domain serves at root.
  output: 'static',

  // The build emits /podcast/index.html, so the canonical URL has a trailing
  // slash. Enforce it everywhere: dev 404s a slash-less internal link (catching
  // mistakes), and visitors never hit GitHub Pages' 301 redirect hop.
  trailingSlash: 'always',

  build: {
    // Emit /podcast/index.html etc. — friendly URLs on static hosting.
    format: 'directory',
  },

  markdown: {
    // Astro markdown processor (`markdown.remarkPlugins` is deprecated —
    // plugins go through the unified() processor now).
    // remark-breaks: single newlines become <br>, so authored line breaks
    // (e.g. the Listening notes' poetic line breaks) are preserved. Blog
    // posts use blank-line-separated paragraphs, so they're unaffected.
    // Fenced code blocks use Astro's default Shiki (github-dark) — a dark,
    // syntax-highlighted block; .prose styles only the box around it.
    processor: unified({ remarkPlugins: [remarkBreaks] }),
  },

  integrations: [
    mdx(),
    // Generates /sitemap-index.xml + /sitemap-0.xml from `site`. Noindex'd
    // pages (src/data/seo.ts — currently the styleguide) stay out of it.
    sitemap({
      filter: (page) => !isNoindexPage(page),
    }),
    // Cuts LXGW WenKai down to the characters the built pages actually
    // render (~3.9MB → ~340kB). BUILD ONLY: `astro dev` keeps the full
    // font, so authoring always previews every character. See
    // scripts/subset-cjk.mjs.
    cjkSubset(),
    // Drops the full-size originals Astro emits beside the optimised
    // variants — nothing links them, and they published 4032×3024 photos
    // for images the site shows at ~520px. Runs last so it sees the final
    // reference graph. See scripts/prune-assets.mjs.
    pruneUnreferencedAssets(),
  ],
});
