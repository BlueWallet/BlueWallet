import assert from 'assert';
import * as bip39 from 'bip39';

import {
  getBip39PrefixMatches,
  getImportWalletSuggestions,
  getWordFragmentAtCursor,
  replaceWordFragment,
  shouldOfferBip39Suggestions,
} from '../../blue_modules/bip39WordSuggestions';

describe("getWordFragmentAtCursor", () => {
  it("extracts fragment at end of text", () => {
    const result = getWordFragmentAtCursor("aban", 4);
    assert.deepStrictEqual(result, { fragment: "aban", start: 0, end: 4 });
  });

  it("extracts fragment in the middle of a phrase", () => {
    const result = getWordFragmentAtCursor("abandon aban", 12);
    assert.deepStrictEqual(result, { fragment: "aban", start: 8, end: 12 });
  });

  it("returns null when cursor is after a space", () => {
    const result = getWordFragmentAtCursor("abandon ", 8);
    assert.strictEqual(result, null);
  });

  it("returns null for empty text", () => {
    assert.strictEqual(getWordFragmentAtCursor("", 0), null);
  });

  it("returns null for non-word tokens like xpub", () => {
    const result = getWordFragmentAtCursor("xprv9s21ZrQH143K", 5);
    assert.strictEqual(result, null);
  });

  it("returns null for WIF-like tokens with digits", () => {
    const result = getWordFragmentAtCursor("L1uyy5qTuGrVXrm", 3);
    assert.strictEqual(result, null);
  });
});

describe("getBip39PrefixMatches", () => {
  it("returns english matches for a latin prefix", () => {
    const matches = getBip39PrefixMatches("aban");
    assert.ok(matches.includes("abandon"));
    assert.ok(matches.length <= 8);
  });

  it("returns empty array for nonsense prefix", () => {
    const matches = getBip39PrefixMatches("sfsdfffsfg");
    assert.deepStrictEqual(matches, []);
  });

  it("returns empty array for empty prefix", () => {
    assert.deepStrictEqual(getBip39PrefixMatches(""), []);
  });

  it("uses the english wordlist only", () => {
    const matches = getBip39PrefixMatches("aban");
    assert.ok(matches.includes("abandon"));
    assert.ok(matches.every((word) => bip39.wordlists.english.includes(word)));
  });

  it("respects the limit parameter", () => {
    const matches = getBip39PrefixMatches("a", 3);
    assert.strictEqual(matches.length, 3);
  });

  it("matches case-insensitively", () => {
    const lower = getBip39PrefixMatches("aban");
    const upper = getBip39PrefixMatches("ABAN");
    assert.deepStrictEqual(lower, upper);
  });
});

describe('replaceWordFragment', () => {
  it('replaces fragment with word and trailing space', () => {
    const fragment = getWordFragmentAtCursor('aban', 4)!;
    const { newText, newCursor } = replaceWordFragment('aban', fragment, 'abandon');
    assert.strictEqual(newText, 'abandon ');
    assert.strictEqual(newCursor, 8);
  });

  it('replaces fragment in the middle of a phrase', () => {
    const fragment = getWordFragmentAtCursor('abandon aban', 12)!;
    const { newText, newCursor } = replaceWordFragment('abandon aban', fragment, 'abandon');
    assert.strictEqual(newText, 'abandon abandon ');
    assert.strictEqual(newCursor, 16);
  });
});

describe('shouldOfferBip39Suggestions', () => {
  it('allows empty input', () => {
    assert.strictEqual(shouldOfferBip39Suggestions(''), true);
  });

  it('rejects extended keys', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('xprv9s21ZrQH143K'), false);
    assert.strictEqual(shouldOfferBip39Suggestions('zpub6rfr'), false);
  });

  it('rejects long hex strings', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('0123456789abcdef0123456789abcdef'), false);
  });

  it('rejects lnd aezeed payloads', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('aezeed12345'), false);
  });

  it('rejects non-latin mnemonics', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('あいう'), false);
  });

  it('rejects when a completed word is not in the english bip39 wordlist', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('abstracted abandon'), false);
  });

  it('allows in-progress english bip39 phrases', () => {
    assert.strictEqual(shouldOfferBip39Suggestions('abandon aban'), true);
  });

  it('allows phrases with leading whitespace', () => {
    assert.strictEqual(shouldOfferBip39Suggestions(' abandon aban'), true);
  });
});

describe('getImportWalletSuggestions', () => {
  it('returns matches for english bip39 prefixes', () => {
    const matches = getImportWalletSuggestions('aban', 4);
    assert.ok(matches.includes('abandon'));
  });

  it('returns empty array for single-character prefixes', () => {
    assert.deepStrictEqual(getImportWalletSuggestions('a', 1), []);
  });

  it('returns empty array for extended keys', () => {
    assert.deepStrictEqual(getImportWalletSuggestions('xprv9s21ZrQH143K', 5), []);
  });

  it('returns empty array for single-character prefixes even when prefix would match', () => {
    assert.deepStrictEqual(getImportWalletSuggestions('a', 1), []);
    assert.ok(getBip39PrefixMatches('a').length > 0);
  });

  it('returns matches when leading whitespace precedes the seed phrase', () => {
    const matches = getImportWalletSuggestions(' abandon aban', 13);
    assert.ok(matches.includes('abandon'));
  });
});
