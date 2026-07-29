/* ============================================================
   Homepage content — hero credo, Explore intro, and the four
   "rooms". Images are imported so Astro optimizes them.
   ============================================================ */
import type { ImageMetadata } from 'astro';
import podcastLogo from '../assets/images/podcast-logo.png';
import expRiso from '../assets/images/experimenting-riso.jpg';
import roomReading from '../assets/images/room-reading.jpg';
import roomListening from '../assets/images/room-listening.jpg';

/** Hero credo (the Walter Mitty / Life magazine motto), one line per array item. */
export const credo = [
  'To see the world,',
  'things dangerous to come to,',
  'to see behind walls, draw closer,',
  'to find each other, and to feel.',
  'That is the purpose of life.',
];

export const explore = {
  eyebrow: 'Explore',
  headingLead: 'A few things I make and',
  headingEm: 'return to.', // rendered in italic accent
  intro: 'Pulled from what I’m making, reading, and listening to lately.',
};

export interface Room {
  key: string;
  label: string;
  href: string;
  img: ImageMetadata;
  fit: 'cover' | 'contain';
  imgBg?: string;
  featured: boolean;
  desc: string;
  cta: string;
}

export const rooms: Room[] = [
  {
    key: 'podcast',
    label: 'Podcast',
    href: '/podcast/',
    img: podcastLogo,
    fit: 'contain',
    imgBg: '#ffffff',
    featured: true,
    desc: 'A podcast I make about French culture, language, and the small details that rarely get their own spotlight.',
    cta: 'Listen in',
  },
  {
    key: 'experimenting',
    label: 'Experimenting',
    href: '/experimenting/',
    img: expRiso,
    fit: 'cover',
    featured: true,
    desc: 'Writing about projects, experiments, and AI workflows as they take shape.',
    cta: 'See the work',
  },
  {
    key: 'reading',
    label: 'Reading',
    href: '/reading/',
    img: roomReading,
    fit: 'cover',
    featured: false,
    desc: 'Short notes, quotes, and tiny audio postcards from books that left an impression.',
    cta: 'Open notes',
  },
  {
    key: 'listening',
    label: 'Listening',
    href: '/listening/',
    img: roomListening,
    fit: 'cover',
    featured: false,
    desc: 'A shelf of things that felt too good to keep to myself.',
    cta: 'Browse the shelf',
  },
];
