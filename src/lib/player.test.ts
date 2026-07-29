import { describe, it, expect } from 'vitest';
import {
  formatTime,
  clampTime,
  seekRatio,
  cycleSpeed,
  SKIP_BACK,
  SKIP_FWD,
  SPEEDS,
} from './player';

describe('formatTime', () => {
  it('formats m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
  it('switches to h:mm:ss past an hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7325)).toBe('2:02:05');
  });
  it('floors fractional seconds', () => {
    expect(formatTime(5.9)).toBe('0:05');
  });
  it('is safe for NaN / Infinity / negative', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-10)).toBe('0:00');
  });
});

describe('clampTime', () => {
  it('clamps into [0, duration]', () => {
    expect(clampTime(50, 100)).toBe(50);
    expect(clampTime(-5, 100)).toBe(0);
    expect(clampTime(150, 100)).toBe(100);
  });
  it('only floors at 0 when the duration is unknown', () => {
    expect(clampTime(50, NaN)).toBe(50);
    expect(clampTime(-5, NaN)).toBe(0);
    expect(clampTime(50, 0)).toBe(50);
  });
  it('handles a NaN target', () => {
    expect(clampTime(NaN, 100)).toBe(0);
  });
  it('models a forward-skip past the end', () => {
    // currentTime 1900 + SKIP_FWD on a 1926s episode → clamps to the end
    expect(clampTime(1900 + SKIP_FWD, 1926)).toBe(1926);
  });
  it('models a back-skip below the start', () => {
    expect(clampTime(5 - SKIP_BACK, 1926)).toBe(0);
  });
});

describe('seekRatio', () => {
  it('maps clientX to 0..1 across the track', () => {
    expect(seekRatio(50, 0, 100)).toBe(0.5);
    expect(seekRatio(0, 0, 100)).toBe(0);
    expect(seekRatio(100, 0, 100)).toBe(1);
  });
  it('clamps out-of-bounds positions', () => {
    expect(seekRatio(-20, 0, 100)).toBe(0);
    expect(seekRatio(200, 0, 100)).toBe(1);
  });
  it('accounts for the track left offset', () => {
    expect(seekRatio(60, 10, 100)).toBe(0.5);
  });
  it('is safe for zero / negative width', () => {
    expect(seekRatio(50, 0, 0)).toBe(0);
    expect(seekRatio(50, 0, -10)).toBe(0);
  });
});

describe('cycleSpeed', () => {
  it('cycles through the speed list and wraps', () => {
    expect(cycleSpeed(1)).toBe(1.25);
    expect(cycleSpeed(1.25)).toBe(1.5);
    expect(cycleSpeed(1.5)).toBe(2);
    expect(cycleSpeed(2)).toBe(1);
  });
  it('falls back to the first speed for an unknown current rate', () => {
    expect(cycleSpeed(0.5)).toBe(SPEEDS[0]);
    expect(cycleSpeed(3)).toBe(SPEEDS[0]);
  });
});

describe('constants', () => {
  it('are the expected skip amounts', () => {
    expect(SKIP_BACK).toBe(15);
    expect(SKIP_FWD).toBe(30);
    expect(SPEEDS).toEqual([1, 1.25, 1.5, 2]);
  });
});
