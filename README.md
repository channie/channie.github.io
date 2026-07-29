# channie.org

Channie's personal website: a quiet, editorial home base for her podcast, reading
notes, listening picks, and experiments. Built with Astro, vanilla CSS on a design
token system, and deployed on GitHub Pages at [channie.org](https://channie.org).

## Requirements

- Node 22.12 or newer. An `.nvmrc` pins Node 22.

## Getting Started

```sh
nvm use
npm install
npm run dev
```

The local dev server runs at `http://localhost:4321`.

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run Astro diagnostics and type checks |
| `npm test` | Run the Vitest suite |

## Project Structure

```text
src/
  assets/      optimized images, mirrored podcast art, and self-hosted fonts
  components/  reusable Astro components and progressive-enhancement islands
  content/     books, experiments, and listening notes
  data/        site navigation, podcast metadata, platform links, SEO settings
  layouts/     document shell and feature-article layout
  lib/         feed validation, players, and other tested browser helpers
  pages/       site routes
  styles/      tokens, global styles, and CJK font loading
public/        static assets, social images, videos, robots.txt, and CNAME
scripts/       podcast RSS snapshot refresh
tests/         integration tests for RSS parsing
```

## Deployment

Pushing to `main` runs GitHub Actions, checks the source, runs tests, builds the
static site, and deploys it to GitHub Pages. A scheduled workflow refreshes the
podcast RSS snapshot so new episodes can appear without a manual content change.

## License

Copyright (c) 2026 Channie Wu. All rights reserved.

This repository is public for reference, not as a template. No permission is
granted to reuse its code, content, design, or assets. Linking is welcome, and
short quotations are fine with attribution and a link back. See
[LICENSE](./LICENSE) for the full terms.
