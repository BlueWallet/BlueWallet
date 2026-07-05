import assert from "assert";
import * as bip39 from "bip39";

import {
  getBip39PrefixMatches,
  getWordFragmentAtCursor,
  replaceWordFragment,
} from "../../blue_modules/bip39WordSuggestions";

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

describe("replaceWordFragment", () => {
  it("replaces fragment with word and trailing space", () => {
    const fragment = getWordFragmentAtCursor("aban", 4)!;
    const { newText, newCursor } = replaceWordFragment(
      "aban",
      fragment,
      "abandon",
    );
    assert.strictEqual(newText, "abandon ");
    assert.strictEqual(newCursor, 8);
  });

  it("replaces fragment in the middle of a phrase", () => {
    const fragment = getWordFragmentAtCursor("abandon aban", 12)!;
    const { newText, newCursor } = replaceWordFragment(
      "abandon aban",
      fragment,
      "abandon",
    );
    assert.strictEqual(newText, "abandon abandon ");
    assert.strictEqual(newCursor, 16);
  });
});
