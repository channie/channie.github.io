import { describe, it, expect } from 'vitest';
import { formatDuration } from './bookAudio';

describe('formatDuration', () => {
  it('formats sub-minute clips with a zero minute', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(24)).toBe('0:24');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('zero-pads seconds but not minutes', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(23.4)).toBe('0:23');
    expect(formatDuration(23.6)).toBe('0:24');
    expect(formatDuration(59.6)).toBe('1:00'); // rolls the minute over
  });

  it('floors junk input at 0:00 rather than emitting NaN', () => {
    expect(formatDuration(-3)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(Infinity)).toBe('0:00');
  });

  it('allows minutes past 59 (no hour rollover — clips stay short)', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });
});
