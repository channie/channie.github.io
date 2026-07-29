/* ============================================================
   Channie.org — site-wide data
   Brand, navigation, footer, and social/contact links.
   Edit content here without touching layout code.
   ============================================================ */

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  /** icon key, mapped to an inline SVG in Icon.astro */
  icon: 'mail' | 'linkedin-badge';
}

export const site = {
  /** Brand */
  name: 'Channie',
  fullName: 'Channie Wu',
  pron: '[ SHWEN-nee ]',
  /** Used in <title> templates and meta */
  domain: 'channie.org',
  url: 'https://channie.org',
  description: 'A personal home for creative work and things I keep returning to.',

  /** Primary navigation (Home first) */
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Podcast', href: '/podcast/' },
    { label: 'Reading', href: '/reading/' },
    { label: 'Listening', href: '/listening/' },
    { label: 'Experimenting', href: '/experimenting/' },
  ] satisfies NavItem[],

  /** Footer */
  footer: {
    /** Stylized quote kept at the top of the footer. */
    quote: 'Curiosity is my compass. Attention is my practice.',
    /** Identity block below the quote. */
    roleLine: 'Software · Product · People',
    copyright: '© 2026 Channie',
  },

  /** Social / contact */
  social: [
    { label: 'Email', href: 'mailto:hello@channie.org', icon: 'mail' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/channiewu', icon: 'linkedin-badge' },
  ] satisfies SocialLink[],

  email: 'hello@channie.org',

  /** Privacy-friendly analytics (GoatCounter — no cookies, no PII). To turn
      it ON: create a free site at https://www.goatcounter.com, then set
      `goatcounter` to your code (the `<code>` in `<code>.goatcounter.com`).
      Empty string = analytics off (nothing loads). */
  analytics: {
    goatcounter: 'channie',
  },
} as const;

export type Site = typeof site;
