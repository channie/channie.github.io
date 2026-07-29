import { describe, it, expect } from 'vitest';
import { getPodcast } from './podcast';

/* Guards the contract between scripts/fetch-podcast.mjs (which writes the
   snapshot) and the site (which reads it through the zod schema): if the
   script's output shape drifts, this fails before a broken build does. */
describe('podcast feed snapshot', () => {
  it('the committed snapshot passes schema validation', () => {
    expect(() => getPodcast()).not.toThrow();
  });

  it('has the fields every podcast surface depends on', () => {
    const feed = getPodcast();
    expect(feed.show.title.length).toBeGreaterThan(0);
    expect(feed.episodes.length).toBeGreaterThan(0);
    expect(feed.latest).not.toBeNull();
    expect(feed.latest!.audioUrl).toMatch(/^https:\/\//);
    for (const ep of feed.episodes) {
      expect(ep.title.length).toBeGreaterThan(0);
      expect(ep.duration).toMatch(/^\d+:\d{2}(:\d{2})?$/);
    }
  });

  it('episodes are sorted newest-first and latest matches episodes[0]', () => {
    const { episodes, latest } = getPodcast();
    const dates = episodes.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(latest!.title).toBe(episodes[0].title);
  });
});
