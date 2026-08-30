import * as bip39 from 'bip39';

const ENGLISH_BIP39_WORDS: string[] = bip39.wordlists.english;
const ENGLISH_BIP39_WORD_SET = new Set(ENGLISH_BIP39_WORDS);

/** Minimum typed characters before showing prefix suggestions. */
export const BIP39_SUGGESTION_MIN_PREFIX_LENGTH = 2;

const EXTENDED_KEY_PREFIX = /^(xprv|xpub|ypub|yprv|zpub|zprv|tpub|tprv|vprv|vpub)/i;
const HEX_BODY_PATTERN = /^[0-9a-fA-F]+$/;
const LND_AEZEED_PREFIX = /^aezeed/i;
const BASIC_LATIN_FRAGMENT_PATTERN = /^[\p{L}\p{M}]+$/u;

export interface WordFragment {
  fragment: string;
  start: number;
  end: number;
}

const WORD_FRAGMENT_PATTERN = BASIC_LATIN_FRAGMENT_PATTERN;

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

function getCompletedWords(text: string): string[] {
  const trimmed = text.trimEnd();
  if (!trimmed) {
    return [];
  }

  const parts = trimmed.split(/\s+/).filter(word => word.length > 0);
  if (!/\s$/.test(text)) {
    return parts.slice(0, -1);
  }

  return parts;
}

export function shouldOfferBip39Suggestions(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();

  if (EXTENDED_KEY_PREFIX.test(normalized)) {
    return false;
  }

  if (LND_AEZEED_PREFIX.test(normalized)) {
    return false;
  }

  const withoutSpaces = trimmed.replace(/\s+/g, '');
  if (withoutSpaces.length >= 16 && HEX_BODY_PATTERN.test(withoutSpaces)) {
    return false;
  }

  if (/[^\u0000-\u024F\s]/u.test(trimmed)) {
    return false;
  }

  const completedWords = getCompletedWords(text);
  for (const word of completedWords) {
    if (!BASIC_LATIN_FRAGMENT_PATTERN.test(word)) {
      return false;
    }
    if (!ENGLISH_BIP39_WORD_SET.has(word.toLowerCase())) {
      return false;
    }
  }

  return true;
}

export function getImportWalletSuggestions(text: string, cursor: number): string[] {
  if (!shouldOfferBip39Suggestions(text)) {
    return [];
  }

  const fragment = getWordFragmentAtCursor(text, cursor);
  if (!fragment || fragment.fragment.length < BIP39_SUGGESTION_MIN_PREFIX_LENGTH) {
    return [];
  }

  return getBip39PrefixMatches(fragment.fragment);
}
