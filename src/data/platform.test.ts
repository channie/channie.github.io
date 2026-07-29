import { describe, it, expect } from 'vitest';
import { platform } from './platform';

describe('platform', () => {
  it('detects the platforms used by the listening content (by hostname)', () => {
    expect(platform('https://open.spotify.com/show/x').slug).toBe('spotify');
    expect(platform('https://podcasts.apple.com/us/podcast/x/id1').slug).toBe('apple');
    expect(platform('https://www.youtube.com/@channel').slug).toBe('youtube');
    expect(platform('https://youtu.be/abc123').slug).toBe('youtube');
    expect(platform('https://player.soundon.fm/p/x').slug).toBe('soundon');
  });

  it('does NOT match platform names appearing elsewhere in the URL', () => {
    expect(platform('https://example.com/apple-pie').slug).toBe('link');
    expect(platform('https://myspotify.example.com/x').slug).toBe('link');
    expect(platform('https://example.com/?ref=youtube').slug).toBe('link');
  });

  it('falls back to a generic link for unknown hosts and garbage', () => {
    expect(platform('https://some.show.example/feed').slug).toBe('link');
    expect(platform('not a url').slug).toBe('link');
    expect(platform('').slug).toBe('link');
  });

  it('localizes the verb and name', () => {
    expect(platform('https://open.spotify.com/show/x', 'zh').verb).toBe('在 Spotify 收聽');
    expect(platform('https://open.spotify.com/show/x', 'en').verb).toBe('Listen on Spotify');
    expect(platform('https://x.example/', 'zh').name).toBe('節目主頁');
    expect(platform('https://x.example/', 'en').name).toBe('Show page');
  });
});
