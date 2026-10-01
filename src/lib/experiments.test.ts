import { describe, it, expect } from 'vitest';
import { splitFeatured, type FeaturablePost } from './experiments';

const post = (id: string, date: string, featured = false): FeaturablePost => ({
  id,
  data: { date: new Date(date), featured },
});

describe('splitFeatured', () => {
  it('features the newest post when none is flagged', () => {
    const { featured, rest } = splitFeatured([
      post('old', '2026-05-23'),
      post('new', '2026-09-29'),
      post('mid', '2026-07-20'),
    ]);
    expect(featured?.id).toBe('new');
    expect(rest.map((p) => p.id)).toEqual(['mid', 'old']);
  });

  it('features the flagged post even when it is not the newest', () => {
    const { featured, rest } = splitFeatured([
      post('newest', '2026-09-29'),
      post('flagged', '2026-08-26', true),
      post('oldest', '2026-05-23'),
    ]);
    expect(featured?.id).toBe('flagged');
    // the rest keep newest-first order, without the featured post
    expect(rest.map((p) => p.id)).toEqual(['newest', 'oldest']);
  });

  it('fails loudly, naming the posts, when more than one is flagged', () => {
    const posts = [
      post('a', '2026-08-26', true),
      post('b', '2026-05-23', true),
      post('c', '2026-09-29'),
    ];
    expect(() => splitFeatured(posts)).toThrow(/2 posts have `featured: true` \(a, b\)/);
  });

  it('handles an empty collection', () => {
    expect(splitFeatured([])).toEqual({ featured: undefined, rest: [] });
  });

  it('does not reorder the caller’s array', () => {
    const posts = [post('old', '2026-05-23'), post('new', '2026-09-29')];
    splitFeatured(posts);
    expect(posts.map((p) => p.id)).toEqual(['old', 'new']);
  });
});
