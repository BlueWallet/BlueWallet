import assert from 'assert';
import { BorderWallet } from '../../class';

function XMLHttpRequest() {}
XMLHttpRequest.prototype.getResponseHeader = function () {};
global.XMLHttpRequest = XMLHttpRequest;

const { wordList, generateSeedGrid, regenerateSeedGrid, generateFinalWord, getFinalWordNumber } = require('../../class/border-wallet-grid');
const fs = require('fs');
const { resolve } = require('path');

describe('Border wallet grid utilities', () => {
  it('generate seed and cells of entropy grid', async () => {
    const { cells: cells128, seed: seed128 } = await generateSeedGrid(BorderWallet.EntropyType.DEFAULT);
    // Since each value will be shuffled,
    // only the quantity and whether it is included in the wordList can be determined.
    assert.strictEqual(2048, cells128?.length);
    assert.ok(cells128?.every(word => wordList.some(list => list.startsWith(word))));
    assert.strictEqual(12, seed128?.split(' ')?.length);

    // max bits of entropy can not be restored, as 2048! is too big.
    const { cells: cellsmax, seed: seedmax } = await generateSeedGrid(BorderWallet.EntropyType.MAX);
    assert.strictEqual(2048, cellsmax?.length);
    assert.ok(cellsmax?.every(word => wordList.some(list => list.startsWith(word))));
    assert.strictEqual(false, !!seedmax);
  });

  it('regenerate seed and cells of entropy grid', async () => {
    // just 128 bits because max bits has no mnemonic.
    const { cells: cellsOriginal128, seed: seed128 } = await generateSeedGrid(BorderWallet.EntropyType.DEFAULT);
    const { cells: cellsRestored } = await regenerateSeedGrid(seed128.split(' '));

    assert.strictEqual(2048, cellsRestored?.length);
    assert.strictEqual(cellsOriginal128.toString(), cellsRestored.toString());
  });

  it('generate final word', async () => {
    const words11 = ['someone', 'diesel', 'wide', 'equal', 'real', 'gaze', 'load', 'age', 'short', 'blur', 'hub'];
    const words23 = [
      'turkey',
      'truly',
      'desert',
      'because',
      'section',
      'evidence',
      'cherry',
      'right',
      'island',
      'know',
      'floor',
      'document',
      'add',
      'sustain',
      'trust',
      'wrist',
      'bleak',
      'true',
      'feel',
      'laugh',
      'caution',
      'rich',
      'ball',
    ];
    const finalWordNumber = 80;
    const finalWordNumber_diff = 7;

    const res10 = await generateFinalWord(words11.slice(1), finalWordNumber);
    assert.strictEqual(
      'The wallet seed must be 11 or 23 words and the final word number must also meet the range requirements.',
      res10.error,
    );
    const res21 = await generateFinalWord(words23.slice(2), finalWordNumber);
    assert.strictEqual(
      'The wallet seed must be 11 or 23 words and the final word number must also meet the range requirements.',
      res21.error,
    );

    const res11Mismatch = await generateFinalWord(words11.slice(1).concat('dsfada'), finalWordNumber);
    assert.strictEqual('Wallet Seed has invalid word(s).', res11Mismatch.error);

    const res11 = await generateFinalWord(words11, finalWordNumber);
    assert.strictEqual(true, !res11.error);
    const res11_diff_words = await generateFinalWord(words11.slice(1).concat('fox'), finalWordNumber);
    assert.notStrictEqual(res11.checksum, res11_diff_words.checksum);
    const res11_same = await generateFinalWord(words11, finalWordNumber);
    assert.strictEqual(res11.checksum, res11_same.checksum);
    const res11_diff_finalNum = await generateFinalWord(words11, finalWordNumber_diff);
    assert.notStrictEqual(res11.checksum, res11_diff_finalNum.checksum);
  });

  it('get a final word number', async () => {
    const n_12 = 12;
    const n_24 = 24;

    // 12 words : 1 - 128
    const fwn_1 = await getFinalWordNumber(n_12);
    assert.ok(fwn_1 >= 1 && fwn_1 <= 128);
    const fwn_2 = await getFinalWordNumber(n_12);
    assert.ok(fwn_2 >= 1 && fwn_2 <= 128);
    const fwn_3 = await getFinalWordNumber(n_12);
    assert.ok(fwn_3 >= 1 && fwn_3 <= 128);

    // 24 words : 1 - 8
    const fwn_4 = await getFinalWordNumber(n_24);
    assert.ok(fwn_4 >= 1 && fwn_4 <= 8);
    const fwn_5 = await getFinalWordNumber(n_24);
    assert.ok(fwn_5 >= 1 && fwn_5 <= 8);
    const fwn_6 = await getFinalWordNumber(n_24);
    assert.ok(fwn_6 >= 1 && fwn_6 <= 8);
  });

  it('skip loading pdf and extract text of 2048 cells', () => {
    const pdf = fs.readFileSync(resolve(__dirname, './fixtures/BorderWalletEntropyGrid.pdf'), 'utf8');
    const filter1 = /\S*\([a-z]{3,4}\) Tj\S*/g;
    const filter2 = /[a-z]{3,4}/g;
    const cells = pdf.match(filter1)?.join('').match(filter2);

    assert.strictEqual(2048, cells?.length);
    assert.ok(cells?.every(word => wordList.some(list => list.startsWith(word))));
  });
});
