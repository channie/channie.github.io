/* Every font family the design tokens name must be one the site ships.

   A CSS font stack fails SILENTLY. If a family isn't declared by any
   @font-face (and isn't installed on the visitor's machine), the browser
   quietly moves on to the next one: no error, no 404, nothing in the
   console. That is how the site went live with no Hanken Grotesk at all.
   The tokens asked for 'Hanken Grotesk' (the Google Fonts name), but the
   self-hosted @fontsource-variable package registers it as
   'Hanken Grotesk Variable', so every sans-serif line fell back to the
   system font. Type checks, builds, visual reviews and pixel baselines all
   passed, because each looked at the stylesheet (whose computed
   font-family still reads "Hanken Grotesk") or at a picture of the
   fallback, never at which font was actually in use.

   This closes that gap statically, so it runs everywhere `npm test` does:
   collect the @font-face families from every font stylesheet that src/
   imports, then check that every family a --font-* token names is either
   one of those or a platform font the stack falls back to on purpose. */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const requireFrom = (file: string) => createRequire(file);

/** Named in the stacks on purpose, but the visitor's own: never shipped. */
const PLATFORM_FONTS = new Set(['Georgia', 'Segoe Print', 'Bradley Hand']);
/** CSS generic families and system keywords: not font names at all. */
const KEYWORDS = new Set(['serif', 'sans-serif', 'cursive', 'monospace', 'system-ui', '-apple-system']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(p);
    return /\.(astro|ts|mjs|css)$/.test(d.name) ? [p] : [];
  });
}

/** Absolute paths of every stylesheet imported by a file under src/. */
function importedStylesheets(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(join(root, 'src'))) {
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/^import\s+'([^']+\.css)';/gm)) {
      found.add(spec.startsWith('.') ? resolve(dirname(file), spec) : requireFrom(file).resolve(spec));
    }
  }
  return [...found];
}

/** Family names declared by @font-face rules in the given stylesheets. */
function declaredFamilies(sheets: string[]): Set<string> {
  const families = new Set<string>();
  for (const sheet of sheets) {
    for (const [block] of readFileSync(sheet, 'utf8').matchAll(/@font-face\s*\{[^}]*\}/g)) {
      const m = block.match(/font-family:\s*['"]?([^;'"]+?)['"]?\s*;/);
      if (m) families.add(m[1].trim());
    }
  }
  return families;
}

/** Each --font-* token in tokens.css → the family names in its stack. */
function tokenStacks(): [string, string[]][] {
  const css = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  return [...css.matchAll(/(--font-[\w-]+):\s*([^;]+);/g)].map(([, token, stack]) => [
    token,
    stack
      .split(',')
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
      .filter((f) => !KEYWORDS.has(f)),
  ]);
}

const shipped = declaredFamilies(importedStylesheets());
const stacks = tokenStacks();

describe('font tokens name only fonts the site ships', () => {
  // Guards the scanner itself: if it stopped finding stylesheets or tokens,
  // every check below would pass for the wrong reason.
  it('finds the shipped faces and the font tokens', () => {
    expect(shipped).toContain('Newsreader');
    expect(shipped).toContain('LXGW WenKai TC');
    expect(stacks.map(([token]) => token)).toEqual(
      expect.arrayContaining(['--font-display', '--font-sans', '--font-sans-latin', '--font-hand'])
    );
  });

  it.each(stacks)('%s leads with a shipped face', (_token, families) => {
    // the first family IS the design; a platform font there would mean the
    // site has no face of its own for this role
    expect([...shipped]).toContain(families[0]);
  });

  it.each(stacks)('%s names only shipped or platform fonts', (_token, families) => {
    const unknown = families.filter((f) => !shipped.has(f) && !PLATFORM_FONTS.has(f));
    expect(unknown, `not declared by any imported @font-face: ${unknown.join(', ')}`).toEqual([]);
  });
});
