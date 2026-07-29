/* ============================================================
   Listening — page-level config only.

   The shows themselves live in the `listening` content collection:
   one folder per show at src/content/listening/<slug>/index.md (cover
   logo co-located, diary memo + recommended episodes in frontmatter,
   the longer notes letter in the Markdown body). Edit a show there;
   edit the page chrome here.
   ============================================================ */
export type ListeningLang = 'zh' | 'en';

export const listeningMeta = {
  eyebrow: 'Listening',
  title: 'On repeat lately',
  /** subtitle — the Chinese line leads, the English rides along */
  intro: '近來常按下播放的節目',
  introEn: 'the shows I keep pressing play on',
};

/* ============================================================
   Diary order — the ONE place to reorder the Listening page.

   Each line is a show's slug (its folder name in
   src/content/listening/<slug>/). Shows render top-to-bottom in
   this order; move a line to move a show. Every non-draft show must
   be listed exactly once — the build fails with a clear message if a
   show is missing or a slug here doesn't exist, so nothing silently
   disappears or drifts.
   ============================================================ */
export const listeningOrder: string[] = [
  'bailingguo-book-club',
  'the-skip-podcast',
  'geiwo-yigushi',
  'trevor-noah',
  'monster-training',
  'lab-muffin',
  'james-hoffmann',
  'xiawucha',
  'better-at-beach-volleyball',
  'zuijin-gongzuo',
  'deb-armstrong',
  'woyoushu-nigushi',
  'barbell-medicine',
];
