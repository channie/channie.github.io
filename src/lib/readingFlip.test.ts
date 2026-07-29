import { describe, it, expect } from 'vitest';
import { scrollEdge, splitSentences, splitParagraphs, splitEmphasis } from './readingFlip';

describe('splitEmphasis', () => {
  it('splits a line around the phrase', () => {
    expect(splitEmphasis('in the face: dogs ate better.', 'dogs ate better.')).toEqual([
      'in the face: ',
      'dogs ate better.',
      '',
    ]);
  });

  it('keeps the text on both sides', () => {
    expect(splitEmphasis('a big red apple today', 'big red')).toEqual(['a ', 'big red', ' apple today']);
  });

  it('returns null when the line does not contain the phrase', () => {
    expect(splitEmphasis('nothing here', 'missing')).toBeNull();
    expect(splitEmphasis('nothing here', '')).toBeNull();
  });

  it('uses the first occurrence', () => {
    expect(splitEmphasis('go go go', 'go')).toEqual(['', 'go', ' go go']);
  });
});

describe('splitParagraphs', () => {
  it('breaks a folded YAML passage on its blank lines', () => {
    expect(splitParagraphs('First para.\nSecond para.\nThird para.')).toEqual([
      'First para.',
      'Second para.',
      'Third para.',
    ]);
  });

  it('treats a run of blank lines / stray indent as one break', () => {
    expect(splitParagraphs('One.\n\n\n  Two.  \n   \n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('keeps a single-paragraph passage whole', () => {
    expect(splitParagraphs('  Just the one paragraph.  ')).toEqual(['Just the one paragraph.']);
  });

  it('returns nothing for empty text', () => {
    expect(splitParagraphs('\n  \n')).toEqual([]);
  });
});

describe('splitSentences', () => {
  it('gives each sentence its own line', () => {
    expect(splitSentences("I'll also have to learn to eat. And to love. You can learn anything.")).toEqual(
      ["I'll also have to learn to eat.", 'And to love.', 'You can learn anything.'],
    );
  });

  it('splits CJK sentences, which carry no following space', () => {
    expect(splitSentences('愛，會讓孩子眼睛裡有光。他笑了。')).toEqual([
      '愛，會讓孩子眼睛裡有光。',
      '他笑了。',
    ]);
  });

  it('does not split after a title like "Dr."', () => {
    expect(splitSentences('Dr. Kim staggered up the riverbank. Her legs were numb.')).toEqual([
      'Dr. Kim staggered up the riverbank.',
      'Her legs were numb.',
    ]);
    expect(splitSentences('Mrs. Song went to Mr. Lee. He was out.')).toEqual([
      'Mrs. Song went to Mr. Lee.',
      'He was out.',
    ]);
  });

  it('keeps a text with no sentence break whole', () => {
    expect(splitSentences('You can learn anything')).toEqual(['You can learn anything']);
  });

  it('keeps ! and ? and drops empty pieces', () => {
    expect(splitSentences('Run!  Why?  Because.')).toEqual(['Run!', 'Why?', 'Because.']);
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('scrollEdge', () => {
  it('returns "none" when the content fits', () => {
    expect(scrollEdge(0, 400, 400)).toBe('none');
    expect(scrollEdge(0, 400, 401)).toBe('none'); // within pad
  });

  it('fades the bottom when parked at the top with more below', () => {
    expect(scrollEdge(0, 400, 900)).toBe('bottom');
    expect(scrollEdge(2, 400, 900)).toBe('bottom'); // within pad of top
  });

  it('fades the top when scrolled to the bottom with more above', () => {
    expect(scrollEdge(500, 400, 900)).toBe('top');
    expect(scrollEdge(498, 400, 900)).toBe('top'); // within pad of bottom
  });

  it('fades both edges mid-scroll', () => {
    expect(scrollEdge(200, 400, 900)).toBe('both');
  });

  it('respects a custom pad', () => {
    expect(scrollEdge(0, 400, 405, 10)).toBe('none');
    expect(scrollEdge(8, 400, 900, 10)).toBe('bottom');
  });
});
