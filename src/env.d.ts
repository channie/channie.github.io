/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/* Build-only font tooling used by scripts/subset-cjk.mjs and its tests.
   Neither package ships TypeScript declarations, and `astro check` runs at
   0/0/0, so declare the narrow surface actually used rather than pulling in
   `any` implicitly. */
declare module 'subset-font' {
  /** Subset `font` down to `characters`, returning the encoded font. */
  export default function subsetFont(
    font: Buffer | Uint8Array,
    characters: string,
    options?: { targetFormat?: 'truetype' | 'woff' | 'woff2'; preserveNameIds?: number[] },
  ): Promise<Buffer>;
}

declare module 'fontverter' {
  /** Convert between font container formats (woff2 → truetype, etc.). */
  export function convert(
    font: Buffer | Uint8Array,
    targetFormat: 'truetype' | 'woff' | 'woff2',
    sourceFormat?: string,
  ): Promise<Buffer>;
  export function detectFormat(font: Buffer | Uint8Array): string | undefined;
}
