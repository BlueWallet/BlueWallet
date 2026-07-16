import * as bip39 from 'bip39';

const ENGLISH_BIP39_WORDS: string[] = bip39.wordlists.english;

export interface WordFragment {
  fragment: string;
  start: number;
  end: number;
}

const WORD_FRAGMENT_PATTERN = /^[\p{L}\p{M}]+$/u;

export function getWordFragmentAtCursor(text: string, cursor: number): WordFragment | null {
  if (cursor < 0 || cursor > text.length) {
    return null;
  }

  let start = cursor;
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start--;
  }

  let end = cursor;
  while (end < text.length && !/\s/.test(text[end])) {
    end++;
  }

  const fragment = text.slice(start, end);
  if (fragment.length === 0 || !WORD_FRAGMENT_PATTERN.test(fragment)) {
    return null;
  }

  return { fragment, start, end };
}

export function getBip39PrefixMatches(prefix: string, limit = 8): string[] {
  if (!prefix) {
    return [];
  }

  const normalizedPrefix = prefix.toLowerCase();
  const matches: string[] = [];

  for (const word of ENGLISH_BIP39_WORDS) {
    if (word.toLowerCase().startsWith(normalizedPrefix)) {
      matches.push(word);
      if (matches.length >= limit) {
        break;
      }
    }
  }

  return matches;
}

export function replaceWordFragment(text: string, fragment: WordFragment, word: string): { newText: string; newCursor: number } {
  const newText = text.slice(0, fragment.start) + word + ' ' + text.slice(fragment.end);
  const newCursor = fragment.start + word.length + 1;
  return { newText, newCursor };
}
