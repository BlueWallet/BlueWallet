import jsPDF from 'jspdf';
import 'jspdf-autotable';
const crypto = require('isomorphic-webcrypto');
const fs = require('../blue_modules/fs');
const bip39 = require('bip39');

export const wordList = bip39.wordlists[bip39.getDefaultWordlist()];

const bytesToBinary = byteArray => byteArray.map(x => x.toString(2).padStart(8, '0')).join('');
const normalizeString = str => str.trim().normalize('NFKD');

const generateMnemonic = async () => {
  await crypto.ensureSecure();
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  const binary = bytesToBinary([...entropy]);
  const hash = await crypto.subtle.digest({ name: 'SHA-256' }, entropy);
  const cs = bytesToBinary([...new Uint8Array(hash)]).slice(0, 4);
  const words = (binary + cs)
    .match(/[0-1]{11}/g)
    .map(b => wordList[parseInt(b, 2)])
    .join(' ');
  return words;
};

function Mash() {
  let n = 0xefc8249d;
  const mash = function (data) {
    if (data) {
      data = data.toString();
      for (let i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        let h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    } else n = 0xefc8249d;
  };
  return mash;
}

function uheprng() {
  return (function () {
    const o = 48;
    let c = 1;
    let p = o;
    const s = new Array(o);
    let mash = Mash();

    function rawprng() {
      if (++p >= o) p = 0;
      const t = 1768863 * s[p] + c * 2.3283064365386963e-10;
      return (s[p] = t - (c = t | 0));
    }
    const random = function (range = 2) {
      return Math.floor(range * (rawprng() + ((rawprng() * 0x200000) | 0) * 1.1102230246251565e-16));
    };
    random.cleanString = function (inStr = '') {
      inStr = inStr.replace(/(^\s*)|(\s*$)/gi, '');
      inStr = inStr.replace(/[\x00-\x1F]/gi, '');
      inStr = inStr.replace(/\n /, '\n');
      return inStr;
    };
    random.hashString = function (inStr = '') {
      inStr = random.cleanString(inStr);
      mash(inStr);
      for (let i = 0; i < inStr.length; i++) {
        const k = inStr.charCodeAt(i);
        for (let j = 0; j < o; j++) {
          s[j] -= mash(k);
          if (s[j] < 0) s[j] += 1;
        }
      }
    };
    random.initState = function () {
      mash();
      for (let i = 0; i < o; i++) s[i] = mash(' ');
      c = 1;
      p = o;
    };
    random.done = function () {
      mash = null;
    };
    random.initState();
    return random;
  })();
}

const rnd11Bit = (limit = 2048) => {
  let small = limit;
  while (small >= limit) {
    const big = crypto.getRandomValues(new Uint16Array(1))[0];
    const bigString = big.toString(2).padStart(16, '0');
    const smallString = bigString.slice(5);
    small = parseInt(smallString, 2);
  }
  return small;
};

const shuffle = (array, seed) => {
  const prng = uheprng();
  let getRandom = rnd11Bit;
  if (seed) {
    prng.initState();
    prng.hashString(seed);
    getRandom = prng;
  }
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandom(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  prng.done();
};

const getCellValue = {
  blank: w => '    ',
  char: w => w.slice(0, 4),
  num: w => (wordList.indexOf(w) + 1).toString().padStart(4, '0'),
  idx: w => wordList.indexOf(w).toString().padStart(4, '0'),
  hex: w => ' ' + (wordList.indexOf(w) + 1).toString(16).padStart(3, '0'),
};

const getHeaderCellStyle = text => ({
  content: text,
  styles: {
    fontStyle: 'bold',
    fillColor: 220,
  },
});

const getHeader = () =>
  ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map(n => getHeaderCellStyle(n));

const getTable = (cells, startIndex = 0) => {
  const table = [getHeader()];
  cells.forEach((cell, index) => {
    const i = startIndex + index;
    const col = (index % 16) + 1;
    const row = Math.floor(index / 16) + 1;
    const rowNumber = Math.floor(i / 16) + 1;
    if (!table[row]) table[row] = [getHeaderCellStyle(`${rowNumber}`.padStart(3, '0'))];
    table[row][col] = cell;
  });
  table.push(getHeader());
  table.forEach(row => row.push(row[0]));
  return table;
};

export const saveGrid = (cells, seed, typeOfGrid = 'char') => {
  const tableOpts = {
    theme: 'grid',
    styles: {
      cellPadding: 0.3,
      overflow: 'ellipsize',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
    },
    margin: {
      top: 12,
      right: 10,
      bottom: 10,
      left: 10,
    },
  };
  const gridType = typeOfGrid === 'blank' ? 'Pattern' : 'Entropy';
  const recovery =
    typeOfGrid === 'blank'
      ? 'Create your pattern here before printing an Entropy Grid'
      : seed
      ? `Recovery Phrase: ${seed}`
      : 'Maximum Entropy Grid - keep this safe, there is no way to regenerate it if lost.';
  const topText = page =>
    typeOfGrid === 'blank'
      ? `Pt${page}/2    BWEG No.# ___________  Date: _____________`
      : `Pt${page}/2    BWEG No.# ___________  Date: _____________  Checksum verified?  Y/N   Checksum calculator/method:________________`;
  const logo =
    'data:image/png;base64,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';
  const doc = new jsPDF();

  doc
    .setFontSize(8.5)
    .addImage(logo, 'PNG', 10, 5, 5, 5, 'logo', 'NONE', 0)
    .text(topText(1), 105, 10, {
      align: 'center',
    })
    .autoTable({
      body: getTable(cells.slice(0, 1024)),
      ...tableOpts,
    })
    .text(recovery, 105, 285, {
      align: 'center',
    })
    .addPage()
    .addImage(logo, 'PNG', 10, 5, 5, 5, 'logo', 'NONE', 0)
    .text(topText(2), 105, 10, {
      align: 'center',
    })
    .autoTable({
      body: getTable(cells.slice(1024), 1024),
      ...tableOpts,
    })
    .text(recovery, 105, 285, {
      align: 'center',
    })

  fs.writeFileAndExport(`BorderWallet${gridType}Grid.pdf`, doc.output());
};

/**
 * generate seed and cells
 * @param {*} entropyType 128 or max, default 128
 * @param {*} gridType blank, char, num, idx or hex, default char
 * @returns cells and seed
 */
export const generateSeedGrid = async (entropyType = '128', gridType = 'char') => {
  const words = [...wordList];
  const mnemonic = await generateMnemonic();
  const seed = entropyType === '128' ? mnemonic : null;
  shuffle(words, seed);
  const cells = words.map(getCellValue[gridType]);

  return { cells, seed };
};

/**
 * regenerate cells by grid seed
 * @param {*} gridSeed mnemonic of the grid that will be restored
 * @param {*} gridType blank, char, num, idx or hex, default char
 * @returns cells and seed
 */
export const regenerateSeedGrid = (gridSeed, gridType = 'char') => {
  let mnemonic, cells, error;

  if (gridSeed && gridSeed.length === 12) {
    mnemonic = [...gridSeed].map(x => normalizeString(x.toLowerCase()));
    if (isGoodMnemonic(mnemonic)) {
      mnemonic = mnemonic.join(' ');

      const words = [...wordList];
      shuffle(words, mnemonic);
      cells = words.map(getCellValue[gridType]);
    } else {
      error = 'Grid Seed has invalid word(s).'
    }
  } else {
    error = 'Grid Seed must be 12 words.'
  }

  return { cells, seed: mnemonic, error };
};

const isGoodMnemonic = mnemonic => {
  if (mnemonic.length !== 12) return false;
  return mnemonic.every(x => wordList.includes(x));
};

const deriveChecksumBits = async entropyBuffer => {
  const ENT = entropyBuffer.length * 8;
  const CS = ENT / 32;
  const hash = await crypto.subtle.digest({ name: 'SHA-256' }, entropyBuffer);
  return bytesToBinary([...new Uint8Array(hash)]).slice(0, CS);
};

const validWalletSeedAndEntropy = (walletSeedsNumber, finalWordNumber) => {
  let isValid = false;

  if (walletSeedsNumber === 12) {
    isValid = finalWordNumber >= 1 && finalWordNumber <= 128;
  } else if (walletSeedsNumber === 24) {
    isValid = finalWordNumber >= 1 && finalWordNumber <= 8;
  }

  return isValid;
}

/**
 * generate final word
 * @param {*} walletSeeds 11 or 23 words
 * @param {*} finalWordNumber Strong entropy is used to generate a random number. For a 12th word, it will be between 1-128. For a 24th word it will be between 1-8.
 * @returns final word(AKA. checksum) and error
 */
export const generateFinalWord = async (walletSeeds, finalWordNumber) => {
  let checksum, error;

  if (validWalletSeedAndEntropy(walletSeeds.length + 1, finalWordNumber)) {
    const words = walletSeeds.map(x => normalizeString(x.toLowerCase()));
    if (words.every(x => wordList.includes(x))) {
      const numWords = words.length;
      const entLength = 11 - (numWords + 1) / 3;
      const entBits = (parseInt(finalWordNumber) - 1)
        .toString(2)
        .padStart(8, '0')
        .slice(8 - entLength);
      const wordIndexes = words.map(w => wordList.indexOf(w));
      const bin = wordIndexes.map(n => n.toString(2).padStart(11, '0')).join('') + entBits;
      const binBytes = bin.match(/[0-1]{8}/g);
      const arr = binBytes.map(b => parseInt(b, 2));
      const buf = new Uint8Array(arr);
      const checkSumBits = await deriveChecksumBits(buf);
      const lastWordBits = entBits + checkSumBits;
      const lastWord = wordList[parseInt(lastWordBits, 2)];
      const wordIsValid = wordList.includes(lastWord);
      checksum = wordIsValid ? lastWord : '';
    } else {
      error = 'Wallet Seed has invalid word(s).'
    }
  } else {
    error = 'The wallet seed must be 11 or 23 words and the final word number must also meet the range requirements.'
  }

  return { checksum, error};
};

/**
 * get a final word number
 * @param {*} n 12 or 24
 * @returns final word number
 */
export const getFinalWordNumber = async n => {
  const entBits = 11 - n / 3;
  await crypto.ensureSecure();
  const res = crypto
    .getRandomValues(new Uint8Array(1))[0]
    .toString(2)
    .padStart(8, '0')
    .slice(8 - entBits);

  return parseInt(res, 2) + 1;
};

/**
 * Loading borderwalletgrid.pdf and extract text of 2048 cells.
 * @returns cells
 */
export const getCellsByLoadingPdf = async () => {
  let cells;
  const { data: pdf } = await fs.showFilePickerAndReadFile();

  if (pdf) {
    const filter1 = /\S*\([a-z]{3,4}\) Tj\S*/g;
    const filter2 = /[a-z]{3,4}/g;

    cells = pdf.match(filter1)?.join('').match(filter2);
  } 

  return { cells }
}
