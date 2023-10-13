import * as bip39 from 'bip39';
import createHash from 'create-hash';

// partial (11 or 23 word) seed phrase
export function generateChecksumWords(stringSeedPhrase) {
  const seedPhrase = stringSeedPhrase.toLowerCase().trim().split(' ');

  if ((seedPhrase.length + 1) % 3 > 0) {
    return false; // Partial mnemonic size must be multiple of three words, less one.
  }

  const wordList = bip39.wordlists[bip39.getDefaultWordlist()];

  const concatLenBits = seedPhrase.length * 11;
  const concatBits = new Array(concatLenBits);
  let wordindex = 0;
  for (let i = 0; i < seedPhrase.length; i++) {
    const word = seedPhrase[i];
    const ndx = wordList.indexOf(word.toLowerCase());
    if (ndx === -1) return false;
    // Set the next 11 bits to the value of the index.
    for (let ii = 0; ii < 11; ++ii) {
      concatBits[wordindex * 11 + ii] = (ndx & (1 << (10 - ii))) !== 0; // eslint-disable-line no-bitwise
    }
    ++wordindex;
  }

  const checksumLengthBits = (concatLenBits + 11) / 33;
  const entropyLengthBits = concatLenBits + 11 - checksumLengthBits;
  const varyingLengthBits = entropyLengthBits - concatLenBits;
  const numPermutations = 2 ** varyingLengthBits;

  const bitPermutations = new Array(numPermutations);

  for (let i = 0; i < numPermutations; i++) {
    if (bitPermutations[i] === undefined || bitPermutations[i] === null) bitPermutations[i] = new Array(varyingLengthBits);
    for (let j = 0; j < varyingLengthBits; j++) {
      bitPermutations[i][j] = ((i >> j) & 1) === 1; // eslint-disable-line no-bitwise
    }
  }

  const possibleWords = [];
  for (let i = 0; i < bitPermutations.length; i++) {
    const bitPermutation = bitPermutations[i];
    const entropyBits = new Array(concatLenBits + varyingLengthBits);
    entropyBits.splice(0, 0, ...concatBits);
    entropyBits.splice(concatBits.length, 0, ...bitPermutation.slice(0, varyingLengthBits));

    const entropy = new Array(entropyLengthBits / 8);
    for (let ii = 0; ii < entropy.length; ++ii) {
      for (let jj = 0; jj < 8; ++jj) {
        if (entropyBits[ii * 8 + jj]) {
          entropy[ii] |= 1 << (7 - jj); // eslint-disable-line no-bitwise
        }
      }
    }

    const hash = createHash('sha256').update(Buffer.from(entropy)).digest();

    const hashBits = new Array(hash.length * 8);
    for (let iq = 0; iq < hash.length; ++iq) for (let jq = 0; jq < 8; ++jq) hashBits[iq * 8 + jq] = (hash[iq] & (1 << (7 - jq))) !== 0; // eslint-disable-line no-bitwise

    const wordBits = new Array(11);
    wordBits.splice(0, 0, ...bitPermutation.slice(0, varyingLengthBits));
    wordBits.splice(varyingLengthBits, 0, ...hashBits.slice(0, checksumLengthBits));

    let index = 0;
    for (let j = 0; j < 11; ++j) {
      index <<= 1; // eslint-disable-line no-bitwise
      if (wordBits[j]) {
        index |= 0x1; // eslint-disable-line no-bitwise
      }
    }

    possibleWords.push(wordList[index]);
  }

  return possibleWords;
}
