import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_PLACEHOLDER, HERO_PLACEHOLDER_SOURCE_HASH } from './heroPlaceholder';

const HERO = path.resolve(import.meta.dirname, '../assets/images/hero.jpg');

describe('hero placeholder', () => {
  /* The placeholder is a GENERATED artifact (scripts/bake-hero-placeholder.mjs).
     Nothing in the build regenerates it, so the only thing standing between a
     swapped hero photo and a blur of the OLD photo shipping is this check. */
  it('was baked from the hero photo currently on disk', () => {
    const actual = createHash('sha256').update(readFileSync(HERO)).digest('hex').slice(0, 16);
    expect(
      HERO_PLACEHOLDER_SOURCE_HASH,
      'src/assets/images/hero.jpg changed — re-run `npm run bake:hero` to rebake the placeholder',
    ).toBe(actual);
  });

  it('is a self-contained webp data URI', () => {
    expect(HERO_PLACEHOLDER).toMatch(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/);
  });

  /* It is inlined into every homepage response, so it has to stay tiny. Well
     under a TCP window; if a rebake blows past this, drop the width. */
  it('stays small enough to inline', () => {
    expect(HERO_PLACEHOLDER.length).toBeLessThan(2048);
  });
});
