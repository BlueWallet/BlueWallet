/* eslint-disable no-array-constructor */
const pbkdf2 = require('pbkdf2')
const createHmac = require('create-hmac')
const randombytes = require('randombytes');

// The length of the radix in bits.
const RADIX_BITS = 10;

// The length of the random identifier in bits.
const ID_BITS_LENGTH = 15;

// The length of the iteration exponent in bits.
const ITERATION_EXP_BITS_LENGTH = 5;

// The length of the random identifier and iteration exponent in words.
const ITERATION_EXP_WORDS_LENGTH =
  parseInt((ID_BITS_LENGTH + ITERATION_EXP_BITS_LENGTH + RADIX_BITS - 1) / RADIX_BITS, 10);

// The maximum iteration exponent
const MAX_ITERATION_EXP = Math.pow(2, ITERATION_EXP_BITS_LENGTH);

// The maximum number of shares that can be created.
const MAX_SHARE_COUNT = 16;

// The length of the RS1024 checksum in words.
const CHECKSUM_WORDS_LENGTH = 3;

// The length of the digest of the shared secret in bytes.
const DIGEST_LENGTH = 4;

// The customization string used in the RS1024 checksum and in the PBKDF2 salt.
const SALT_STRING = 'shamir';

// The minimum allowed entropy of the master secret.
const MIN_ENTROPY_BITS = 128;

// The minimum allowed length of the mnemonic in words.
const METADATA_WORDS_LENGTH =
  ITERATION_EXP_WORDS_LENGTH + 2 + CHECKSUM_WORDS_LENGTH;

// The length of the mnemonic in words without the share value.
const MNEMONICS_WORDS_LENGTH = parseInt(
  METADATA_WORDS_LENGTH + (MIN_ENTROPY_BITS + RADIX_BITS - 1) / RADIX_BITS, 10);

// The minimum number of iterations to use in PBKDF2.
const ITERATION_COUNT = 10000;

// The number of rounds to use in the Feistel cipher.
const ROUND_COUNT = 4;

// The index of the share containing the digest of the shared secret.
const DIGEST_INDEX = 254;

// The index of the share containing the shared secret.
const SECRET_INDEX = 255;

//
// Helper functions for SLIP39 implementation.
//
String.prototype.slip39EncodeHex = function () {
  let bytes = [];
  for (let i = 0; i < this.length; ++i) {
    bytes.push(this.charCodeAt(i));
  }
  return bytes;
};

Array.prototype.slip39DecodeHex = function () {
  let str = [];
  const hex = this.toString().split(',');
  for (let i = 0; i < hex.length; i++) {
    str.push(String.fromCharCode(hex[i]));
  }
  return str.toString().replace(/,/g, '');
};

Array.prototype.slip39Generate = function (m, v = _ => _) {
  let n = m || this.length;
  for (let i = 0; i < n; i++) {
    this[i] = v(i);
  }
  return this;
};

Array.prototype.toHexString = function () {
  return Array.prototype.map.call(this, function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
};

Array.prototype.toByteArray = function (hexString) {
  for (let i = 0; i < hexString.length; i = i + 2) {
    this.push(parseInt(hexString.substr(i, 2), 16));
  }
  return this;
};

const BIGINT_WORD_BITS = BigInt(8);

function decodeBigInt(bytes) {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    let b = BigInt(bytes[bytes.length - i - 1]);
    result = result + (b << BIGINT_WORD_BITS * BigInt(i));
  }
  return result;
}

function encodeBigInt(number, paddedLength = 0) {
  let num = number;
  const BYTE_MASK = BigInt(0xff);
  const BIGINT_ZERO = BigInt(0);
  let result = new Array(0);

  while (num > BIGINT_ZERO) {
    let i = parseInt(num & BYTE_MASK, 10);
    result.unshift(i);
    num = num >> BIGINT_WORD_BITS;
  }

  // Zero padding to the length
  for (let i = result.length; i < paddedLength; i++) {
    result.unshift(0);
  }

  if (paddedLength !== 0 && result.length > paddedLength) {
    throw new Error(`Error in encoding BigInt value, expected less than ${paddedLength} length value, got ${result.length}`);
  }

  return result;
}

function bitsToBytes(n) {
  const res = (n + 7) / 8;
  const b = parseInt(res, RADIX_BITS);
  return b;
}

function bitsToWords(n) {
  const res = (n + RADIX_BITS - 1) / RADIX_BITS;
  const b = parseInt(res, RADIX_BITS);
  return b;
}

//
// Returns a randomly generated integer in the range 0, ... , 2**ID_LENGTH_BITS - 1.
//
function randomBytes(length = 32) {
  let randoms = randombytes(length);
  return Array.prototype.slice.call(randoms, 0);
}

//
// The round function used internally by the Feistel cipher.
//
function roundFunction(round, passphrase, exp, salt, secret) {
  const saltedSecret = salt.concat(secret);
  const roundedPhrase = [round].concat(passphrase);
  const count = (ITERATION_COUNT << exp) / ROUND_COUNT;

  const key = pbkdf2.pbkdf2Sync(Buffer.from(roundedPhrase), Buffer.from(saltedSecret), count, secret.length, 'sha256');
  return Array.prototype.slice.call(key, 0);
}

function crypt(masterSecret, passphrase, iterationExponent,
  identifier,
  encrypt = true) {
  // Iteration exponent validated here.
  if (iterationExponent < 0 || iterationExponent > MAX_ITERATION_EXP) {
    throw Error(`Invalid iteration exponent (${iterationExponent}). Expected between 0 and ${MAX_ITERATION_EXP}`);
  }

  let IL = masterSecret.slice().slice(0, masterSecret.length / 2);
  let IR = masterSecret.slice().slice(masterSecret.length / 2);

  const pwd = passphrase.slip39EncodeHex();

  const salt = getSalt(identifier);

  let range = Array().slip39Generate(ROUND_COUNT);
  range = encrypt ? range : range.reverse();

  range.forEach((round) => {
    const f = roundFunction(round, pwd, iterationExponent, salt, IR);
    const t = xor(IL, f);
    IL = IR;
    IR = t;
  });
  return IR.concat(IL);
}

function createDigest(randomData, sharedSecret) {
  const hmac = createHmac('sha256', Buffer.from(randomData));

  hmac.update(Buffer.from(sharedSecret));

  let result = hmac.digest();
  result = result.slice(0, 4);
  return Array.prototype.slice.call(result, 0);
}

function splitSecret(threshold, shareCount, sharedSecret) {
  if (threshold <= 0) {
    throw Error(`The requested threshold (${threshold}) must be a positive integer.`);
  }

  if (threshold > shareCount) {
    throw Error(`The requested threshold (${threshold}) must not exceed the number of shares (${shareCount}).`);
  }

  if (shareCount > MAX_SHARE_COUNT) {
    throw Error(`The requested number of shares (${shareCount}) must not exceed ${MAX_SHARE_COUNT}.`);
  }
  //  If the threshold is 1, then the digest of the shared secret is not used.
  if (threshold === 1) {
    return Array().slip39Generate(shareCount, () => sharedSecret);
  }

  const randomShareCount = threshold - 2;

  const randomPart = randomBytes(sharedSecret.length - DIGEST_LENGTH);
  const digest = createDigest(randomPart, sharedSecret);

  let baseShares = new Map();
  let shares = [];
  if (randomShareCount) {
    shares = Array().slip39Generate(
      randomShareCount, () => randomBytes(sharedSecret.length));
    shares.forEach((item, idx) => {
      baseShares.set(idx, item);
    });
  }
  baseShares.set(DIGEST_INDEX, digest.concat(randomPart));
  baseShares.set(SECRET_INDEX, sharedSecret);

  for (let i = randomShareCount; i < shareCount; i++) {
    const rr = interpolate(baseShares, i);
    shares.push(rr);
  }

  return shares;
}

//
// Returns a randomly generated integer in the range 0, ... , 2**ID_BITS_LENGTH - 1.
//
function generateIdentifier() {
  const byte = bitsToBytes(ID_BITS_LENGTH);
  const bits = ID_BITS_LENGTH % 8;
  const identifier = randomBytes(byte);

  identifier[0] = identifier[0] & (1 << bits) - 1;

  return identifier;
}

function xor(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Invalid padding in mnemonic or insufficient length of mnemonics (${a.length} or ${b.length})`);
  }
  return Array().slip39Generate(a.length, (i) => a[i] ^ b[i]);
}

function getSalt(identifier) {
  const salt = SALT_STRING.slip39EncodeHex();
  return salt.concat(identifier);
}

function interpolate(shares, x) {
  let xCoord = new Set(shares.keys());
  let arr = Array.from(shares.values(), (v) => v.length);
  let sharesValueLengths = new Set(arr);

  if (sharesValueLengths.size !== 1) {
    throw new Error('Invalid set of shares. All share values must have the same length.');
  }

  if (xCoord.has(x)) {
    shares.forEach((v, k) => {
      if (k === x) {
        return v;
      }
    });
  }

  // Logarithm of the product of (x_i - x) for i = 1, ... , k.
  let logProd = 0;

  shares.forEach((v, k) => {
    logProd = logProd + LOG_TABLE[k ^ x];
  });

  let results = Array().slip39Generate(sharesValueLengths.values().next().value, () => 0);

  shares.forEach((v, k) => {
    // The logarithm of the Lagrange basis polynomial evaluated at x.
    let sum = 0;
    shares.forEach((vv, kk) => {
      sum = sum + LOG_TABLE[k ^ kk];
    });

    // FIXME: -18 % 255 = 237. IT shoulud be 237 and not -18 as it's
    // implemented in javascript.
    const basis = (logProd - LOG_TABLE[k ^ x] - sum) % 255;

    const logBasisEval = basis < 0 ? 255 + basis : basis;

    v.forEach((item, idx) => {
      const shareVal = item;
      const intermediateSum = results[idx];
      const r = shareVal !== 0 ?
        EXP_TABLE[(LOG_TABLE[shareVal] + logBasisEval) % 255] : 0;

      const res = intermediateSum ^ r;
      results[idx] = res;
    });
  });
  return results;
}

function rs1024Polymod(data) {
  const GEN = [
    0xE0E040,
    0x1C1C080,
    0x3838100,
    0x7070200,
    0xE0E0009,
    0x1C0C2412,
    0x38086C24,
    0x3090FC48,
    0x21B1F890,
    0x3F3F120
  ];
  let chk = 1;

  data.forEach((byte) => {
    const b = chk >> 20;
    chk = (chk & 0xFFFFF) << 10 ^ byte;

    for (let i = 0; i < 10; i++) {
      let gen = (b >> i & 1) !== 0 ? GEN[i] : 0;
      chk = chk ^ gen;
    }
  });

  return chk;
}

function rs1024CreateChecksum(data) {
  const values = SALT_STRING.slip39EncodeHex()
    .concat(data)
    .concat(Array().slip39Generate(CHECKSUM_WORDS_LENGTH, () => 0));
  const polymod = rs1024Polymod(values) ^ 1;
  const result =
    Array().slip39Generate(CHECKSUM_WORDS_LENGTH, (i) => polymod >> 10 * i & 1023).reverse();

  return result;
}

function rs1024VerifyChecksum(data) {
  return rs1024Polymod(SALT_STRING.slip39EncodeHex().concat(data)) === 1;
}

//
// Converts a list of base 1024 indices in big endian order to an integer value.
//
function intFromIndices(indices) {
  let value = BigInt(0);
  const radix = BigInt(Math.pow(2, RADIX_BITS));
  indices.forEach((index) => {
    value = value * radix + BigInt(index);
  });

  return value;
}

//
// Converts a Big integer value to indices in big endian order.
//
function intToIndices(value, length, bits) {
  const mask = BigInt((1 << bits) - 1);
  const result =
    Array().slip39Generate(length, (i) => parseInt(value >> BigInt(i) * BigInt(bits) & mask, 10));
  return result.reverse();
}

function mnemonicFromIndices(indices) {
  const result = indices.map((index) => {
    return WORD_LIST[index];
  });
  return result.toString().split(',').join(' ');
}

function mnemonicToIndices(mnemonic) {
  if (typeof mnemonic !== 'string') {
    throw new Error(`Mnemonic expected to be typeof string with white space separated words. Instead found typeof ${typeof mnemonic}.`);
  }

  const words = mnemonic.toLowerCase().split(' ');
  const result = words.reduce((prev, item) => {
    const index = WORD_LIST_MAP[item];
    if (typeof index === 'undefined') {
      throw new Error(`Invalid mnemonic word ${item}.`);
    }
    return prev.concat(index);
  }, []);
  return result;
}

function recoverSecret(threshold, shares) {
  // If the threshold is 1, then the digest of the shared secret is not used.
  if (threshold === 1) {
    return shares.values().next().value;
  }

  const sharedSecret = interpolate(shares, SECRET_INDEX);
  const digestShare = interpolate(shares, DIGEST_INDEX);
  const digest = digestShare.slice(0, DIGEST_LENGTH);
  const randomPart = digestShare.slice(DIGEST_LENGTH);

  const recoveredDigest = createDigest(
    randomPart, sharedSecret);
  if (!listsAreEqual(digest, recoveredDigest)) {
    throw new Error('Invalid digest of the shared secret.');
  }
  return sharedSecret;
}

//
// Combines mnemonic shares to obtain the master secret which was previously
// split using Shamir's secret sharing scheme.
//
function combineMnemonics(mnemonics, passphrase = '') {
  if (mnemonics === null || mnemonics.length === 0) {
    throw new Error('The list of mnemonics is empty.');
  }

  const decoded = decodeMnemonics(mnemonics);
  const identifier = decoded.identifier;
  const iterationExponent = decoded.iterationExponent;
  const groupThreshold = decoded.groupThreshold;
  const groupCount = decoded.groupCount;
  const groups = decoded.groups;

  if (groups.size < groupThreshold) {
    throw new Error(`Insufficient number of mnemonic groups (${groups.size}). The required number of groups is ${groupThreshold}.`);
  }

  if (groups.size !== groupThreshold) {
    throw new Error(`Wrong number of mnemonic groups. Expected ${groupThreshold} groups, but ${groups.size} were provided.`);
  }

  let allShares = new Map();
  groups.forEach((members, groupIndex) => {
    const threshold = members.keys().next().value;
    const shares = members.values().next().value;
    if (shares.size !== threshold) {
      const prefix = groupPrefix(
        identifier,
        iterationExponent,
        groupIndex,
        groupThreshold,
        groupCount
      );
      throw new Error(`Wrong number of mnemonics. Expected ${threshold} mnemonics starting with "${mnemonicFromIndices(prefix)}", \n but ${shares.size} were provided.`);
    }

    const recovered = recoverSecret(threshold, shares);
    allShares.set(groupIndex, recovered);
  });

  const ems = recoverSecret(groupThreshold, allShares);
  const id = intToIndices(BigInt(identifier), ITERATION_EXP_WORDS_LENGTH, 8);
  const ms = crypt(ems, passphrase, iterationExponent, id, false);

  return ms;
}

function decodeMnemonics(mnemonics) {
  if (!(mnemonics instanceof Array)) {
    throw new Error('Mnemonics should be an array of strings');
  }
  const identifiers = new Set();
  const iterationExponents = new Set();
  const groupThresholds = new Set();
  const groupCounts = new Set();
  const groups = new Map();

  mnemonics.forEach((mnemonic) => {
    const decoded = decodeMnemonic(mnemonic);

    identifiers.add(decoded.identifier);
    iterationExponents.add(decoded.iterationExponent);
    const groupIndex = decoded.groupIndex;
    groupThresholds.add(decoded.groupThreshold);
    groupCounts.add(decoded.groupCount);
    const memberIndex = decoded.memberIndex;
    const memberThreshold = decoded.memberThreshold;
    const share = decoded.share;

    const group = !groups.has(groupIndex) ? new Map() : groups.get(groupIndex);
    const member = !group.has(memberThreshold) ? new Map() : group.get(memberThreshold);
    member.set(memberIndex, share);
    group.set(memberThreshold, member);
    if (group.size !== 1) {
      throw new Error('Invalid set of mnemonics. All mnemonics in a group must have the same member threshold.');
    }
    groups.set(groupIndex, group);
  });

  if (identifiers.size !== 1 || iterationExponents.size !== 1) {
    throw new Error(`Invalid set of mnemonics. All mnemonics must begin with the same ${ITERATION_EXP_WORDS_LENGTH} words.`);
  }

  if (groupThresholds.size !== 1) {
    throw new Error('Invalid set of mnemonics. All mnemonics must have the same group threshold.');
  }

  if (groupCounts.size !== 1) {
    throw new Error('Invalid set of mnemonics. All mnemonics must have the same group count.');
  }

  return {
    identifier: identifiers.values().next().value,
    iterationExponent: iterationExponents.values().next().value,
    groupThreshold: groupThresholds.values().next().value,
    groupCount: groupCounts.values().next().value,
    groups: groups
  };
}

//
// Converts a share mnemonic to share data.
//
function decodeMnemonic(mnemonic) {
  const data = mnemonicToIndices(mnemonic);

  if (data.length < MNEMONICS_WORDS_LENGTH) {
    throw new Error(`Invalid mnemonic length. The length of each mnemonic must be at least ${MNEMONICS_WORDS_LENGTH} words.`);
  }

  const paddingLen = RADIX_BITS * (data.length - METADATA_WORDS_LENGTH) % 16;
  if (paddingLen > 8) {
    throw new Error('Invalid mnemonic length.');
  }

  if (!rs1024VerifyChecksum(data)) {
    throw new Error('Invalid mnemonic checksum');
  }

  const idExpInt =
    parseInt(intFromIndices(data.slice(0, ITERATION_EXP_WORDS_LENGTH)), 10);
  const identifier = idExpInt >> ITERATION_EXP_BITS_LENGTH;
  const iterationExponent = idExpInt & (1 << ITERATION_EXP_BITS_LENGTH) - 1;
  const tmp = intFromIndices(
    data.slice(ITERATION_EXP_WORDS_LENGTH, ITERATION_EXP_WORDS_LENGTH + 2));

  const indices = intToIndices(tmp, 5, 4);

  const groupIndex = indices[0];
  const groupThreshold = indices[1];
  const groupCount = indices[2];
  const memberIndex = indices[3];
  const memberThreshold = indices[4];

  const valueData = data.slice(
    ITERATION_EXP_WORDS_LENGTH + 2, data.length - CHECKSUM_WORDS_LENGTH);

  if (groupCount < groupThreshold) {
    throw new Error(`Invalid mnemonic: ${mnemonic}.\n Group threshold (${groupThreshold}) cannot be greater than group count (${groupCount}).`);
  }

  const valueInt = intFromIndices(valueData);

  try {
    const valueByteCount = bitsToBytes(RADIX_BITS * valueData.length - paddingLen);
    const share = encodeBigInt(valueInt, valueByteCount);

    return {
      identifier: identifier,
      iterationExponent: iterationExponent,
      groupIndex: groupIndex,
      groupThreshold: groupThreshold + 1,
      groupCount: groupCount + 1,
      memberIndex: memberIndex,
      memberThreshold: memberThreshold + 1,
      share: share
    };
  } catch (e) {
    throw new Error(`Invalid mnemonic padding (${e})`);
  }
}

function validateMnemonic(mnemonic) {
  try {
    decodeMnemonic(mnemonic);
    return true;
  } catch (error) {
    return false;
  }
}

function groupPrefix(
  identifier, iterationExponent, groupIndex, groupThreshold, groupCount) {
  const idExpInt = BigInt(
    (identifier << ITERATION_EXP_BITS_LENGTH) + iterationExponent);

  const indc = intToIndices(idExpInt, ITERATION_EXP_WORDS_LENGTH, RADIX_BITS);

  const indc2 =
    (groupIndex << 6) + (groupThreshold - 1 << 2) + (groupCount - 1 >> 2);

  indc.push(indc2);
  return indc;
}

function listsAreEqual(a, b) {
  if (a === null || b === null || a.length !== b.length) {
    return false;
  }

  let i = 0;
  return a.every((item) => {
    return b[i++] === item;
  });
}

//
//  Converts share data to a share mnemonic.
//
function encodeMnemonic(
  identifier,
  iterationExponent,
  groupIndex,
  groupThreshold,
  groupCount,
  memberIndex,
  memberThreshold,
  value
) {
  // Convert the share value from bytes to wordlist indices.
  const valueWordCount = bitsToWords(value.length * 8);

  const valueInt = decodeBigInt(value);
  let newIdentifier = parseInt(decodeBigInt(identifier), 10);

  const gp = groupPrefix(
    newIdentifier, iterationExponent, groupIndex, groupThreshold, groupCount);
  const tp = intToIndices(valueInt, valueWordCount, RADIX_BITS);

  const calc = ((groupCount - 1 & 3) << 8) +
    (memberIndex << 4) +
    (memberThreshold - 1);

  gp.push(calc);
  const shareData = gp.concat(tp);

  const checksum = rs1024CreateChecksum(shareData);

  return mnemonicFromIndices(shareData.concat(checksum));
}

// The precomputed exponent and log tables.
// ```
//    const exp = List<int>.filled(255, 0)
//    const log = List<int>.filled(256, 0)
//    const poly = 1
//
//    for (let i = 0; i < exp.length; i++) {
//      exp[i] = poly
//      log[poly] = i
//      // Multiply poly by the polynomial x + 1.
//      poly = (poly << 1) ^ poly
//      // Reduce poly by x^8 + x^4 + x^3 + x + 1.
//      if (poly & 0x100 === 0x100) poly ^= 0x11B
//   }
// ```
const EXP_TABLE = [
  1,
  3,
  5,
  15,
  17,
  51,
  85,
  255,
  26,
  46,
  114,
  150,
  161,
  248,
  19,
  53,
  95,
  225,
  56,
  72,
  216,
  115,
  149,
  164,
  247,
  2,
  6,
  10,
  30,
  34,
  102,
  170,
  229,
  52,
  92,
  228,
  55,
  89,
  235,
  38,
  106,
  190,
  217,
  112,
  144,
  171,
  230,
  49,
  83,
  245,
  4,
  12,
  20,
  60,
  68,
  204,
  79,
  209,
  104,
  184,
  211,
  110,
  178,
  205,
  76,
  212,
  103,
  169,
  224,
  59,
  77,
  215,
  98,
  166,
  241,
  8,
  24,
  40,
  120,
  136,
  131,
  158,
  185,
  208,
  107,
  189,
  220,
  127,
  129,
  152,
  179,
  206,
  73,
  219,
  118,
  154,
  181,
  196,
  87,
  249,
  16,
  48,
  80,
  240,
  11,
  29,
  39,
  105,
  187,
  214,
  97,
  163,
  254,
  25,
  43,
  125,
  135,
  146,
  173,
  236,
  47,
  113,
  147,
  174,
  233,
  32,
  96,
  160,
  251,
  22,
  58,
  78,
  210,
  109,
  183,
  194,
  93,
  231,
  50,
  86,
  250,
  21,
  63,
  65,
  195,
  94,
  226,
  61,
  71,
  201,
  64,
  192,
  91,
  237,
  44,
  116,
  156,
  191,
  218,
  117,
  159,
  186,
  213,
  100,
  172,
  239,
  42,
  126,
  130,
  157,
  188,
  223,
  122,
  142,
  137,
  128,
  155,
  182,
  193,
  88,
  232,
  35,
  101,
  175,
  234,
  37,
  111,
  177,
  200,
  67,
  197,
  84,
  252,
  31,
  33,
  99,
  165,
  244,
  7,
  9,
  27,
  45,
  119,
  153,
  176,
  203,
  70,
  202,
  69,
  207,
  74,
  222,
  121,
  139,
  134,
  145,
  168,
  227,
  62,
  66,
  198,
  81,
  243,
  14,
  18,
  54,
  90,
  238,
  41,
  123,
  141,
  140,
  143,
  138,
  133,
  148,
  167,
  242,
  13,
  23,
  57,
  75,
  221,
  124,
  132,
  151,
  162,
  253,
  28,
  36,
  108,
  180,
  199,
  82,
  246
];
const LOG_TABLE = [
  0,
  0,
  25,
  1,
  50,
  2,
  26,
  198,
  75,
  199,
  27,
  104,
  51,
  238,
  223,
  3,
  100,
  4,
  224,
  14,
  52,
  141,
  129,
  239,
  76,
  113,
  8,
  200,
  248,
  105,
  28,
  193,
  125,
  194,
  29,
  181,
  249,
  185,
  39,
  106,
  77,
  228,
  166,
  114,
  154,
  201,
  9,
  120,
  101,
  47,
  138,
  5,
  33,
  15,
  225,
  36,
  18,
  240,
  130,
  69,
  53,
  147,
  218,
  142,
  150,
  143,
  219,
  189,
  54,
  208,
  206,
  148,
  19,
  92,
  210,
  241,
  64,
  70,
  131,
  56,
  102,
  221,
  253,
  48,
  191,
  6,
  139,
  98,
  179,
  37,
  226,
  152,
  34,
  136,
  145,
  16,
  126,
  110,
  72,
  195,
  163,
  182,
  30,
  66,
  58,
  107,
  40,
  84,
  250,
  133,
  61,
  186,
  43,
  121,
  10,
  21,
  155,
  159,
  94,
  202,
  78,
  212,
  172,
  229,
  243,
  115,
  167,
  87,
  175,
  88,
  168,
  80,
  244,
  234,
  214,
  116,
  79,
  174,
  233,
  213,
  231,
  230,
  173,
  232,
  44,
  215,
  117,
  122,
  235,
  22,
  11,
  245,
  89,
  203,
  95,
  176,
  156,
  169,
  81,
  160,
  127,
  12,
  246,
  111,
  23,
  196,
  73,
  236,
  216,
  67,
  31,
  45,
  164,
  118,
  123,
  183,
  204,
  187,
  62,
  90,
  251,
  96,
  177,
  134,
  59,
  82,
  161,
  108,
  170,
  85,
  41,
  157,
  151,
  178,
  135,
  144,
  97,
  190,
  220,
  252,
  188,
  149,
  207,
  205,
  55,
  63,
  91,
  209,
  83,
  57,
  132,
  60,
  65,
  162,
  109,
  71,
  20,
  42,
  158,
  93,
  86,
  242,
  211,
  171,
  68,
  17,
  146,
  217,
  35,
  32,
  46,
  137,
  180,
  124,
  184,
  38,
  119,
  153,
  227,
  165,
  103,
  74,
  237,
  222,
  197,
  49,
  254,
  24,
  13,
  99,
  140,
  128,
  192,
  247,
  112,
  7
];

//
// SLIP39 wordlist
//
const WORD_LIST = [
  'academic',
  'acid',
  'acne',
  'acquire',
  'acrobat',
  'activity',
  'actress',
  'adapt',
  'adequate',
  'adjust',
  'admit',
  'adorn',
  'adult',
  'advance',
  'advocate',
  'afraid',
  'again',
  'agency',
  'agree',
  'aide',
  'aircraft',
  'airline',
  'airport',
  'ajar',
  'alarm',
  'album',
  'alcohol',
  'alien',
  'alive',
  'alpha',
  'already',
  'alto',
  'aluminum',
  'always',
  'amazing',
  'ambition',
  'amount',
  'amuse',
  'analysis',
  'anatomy',
  'ancestor',
  'ancient',
  'angel',
  'angry',
  'animal',
  'answer',
  'antenna',
  'anxiety',
  'apart',
  'aquatic',
  'arcade',
  'arena',
  'argue',
  'armed',
  'artist',
  'artwork',
  'aspect',
  'auction',
  'august',
  'aunt',
  'average',
  'aviation',
  'avoid',
  'award',
  'away',
  'axis',
  'axle',
  'beam',
  'beard',
  'beaver',
  'become',
  'bedroom',
  'behavior',
  'being',
  'believe',
  'belong',
  'benefit',
  'best',
  'beyond',
  'bike',
  'biology',
  'birthday',
  'bishop',
  'black',
  'blanket',
  'blessing',
  'blimp',
  'blind',
  'blue',
  'body',
  'bolt',
  'boring',
  'born',
  'both',
  'boundary',
  'bracelet',
  'branch',
  'brave',
  'breathe',
  'briefing',
  'broken',
  'brother',
  'browser',
  'bucket',
  'budget',
  'building',
  'bulb',
  'bulge',
  'bumpy',
  'bundle',
  'burden',
  'burning',
  'busy',
  'buyer',
  'cage',
  'calcium',
  'camera',
  'campus',
  'canyon',
  'capacity',
  'capital',
  'capture',
  'carbon',
  'cards',
  'careful',
  'cargo',
  'carpet',
  'carve',
  'category',
  'cause',
  'ceiling',
  'center',
  'ceramic',
  'champion',
  'change',
  'charity',
  'check',
  'chemical',
  'chest',
  'chew',
  'chubby',
  'cinema',
  'civil',
  'class',
  'clay',
  'cleanup',
  'client',
  'climate',
  'clinic',
  'clock',
  'clogs',
  'closet',
  'clothes',
  'club',
  'cluster',
  'coal',
  'coastal',
  'coding',
  'column',
  'company',
  'corner',
  'costume',
  'counter',
  'course',
  'cover',
  'cowboy',
  'cradle',
  'craft',
  'crazy',
  'credit',
  'cricket',
  'criminal',
  'crisis',
  'critical',
  'crowd',
  'crucial',
  'crunch',
  'crush',
  'crystal',
  'cubic',
  'cultural',
  'curious',
  'curly',
  'custody',
  'cylinder',
  'daisy',
  'damage',
  'dance',
  'darkness',
  'database',
  'daughter',
  'deadline',
  'deal',
  'debris',
  'debut',
  'decent',
  'decision',
  'declare',
  'decorate',
  'decrease',
  'deliver',
  'demand',
  'density',
  'deny',
  'depart',
  'depend',
  'depict',
  'deploy',
  'describe',
  'desert',
  'desire',
  'desktop',
  'destroy',
  'detailed',
  'detect',
  'device',
  'devote',
  'diagnose',
  'dictate',
  'diet',
  'dilemma',
  'diminish',
  'dining',
  'diploma',
  'disaster',
  'discuss',
  'disease',
  'dish',
  'dismiss',
  'display',
  'distance',
  'dive',
  'divorce',
  'document',
  'domain',
  'domestic',
  'dominant',
  'dough',
  'downtown',
  'dragon',
  'dramatic',
  'dream',
  'dress',
  'drift',
  'drink',
  'drove',
  'drug',
  'dryer',
  'duckling',
  'duke',
  'duration',
  'dwarf',
  'dynamic',
  'early',
  'earth',
  'easel',
  'easy',
  'echo',
  'eclipse',
  'ecology',
  'edge',
  'editor',
  'educate',
  'either',
  'elbow',
  'elder',
  'election',
  'elegant',
  'element',
  'elephant',
  'elevator',
  'elite',
  'else',
  'email',
  'emerald',
  'emission',
  'emperor',
  'emphasis',
  'employer',
  'empty',
  'ending',
  'endless',
  'endorse',
  'enemy',
  'energy',
  'enforce',
  'engage',
  'enjoy',
  'enlarge',
  'entrance',
  'envelope',
  'envy',
  'epidemic',
  'episode',
  'equation',
  'equip',
  'eraser',
  'erode',
  'escape',
  'estate',
  'estimate',
  'evaluate',
  'evening',
  'evidence',
  'evil',
  'evoke',
  'exact',
  'example',
  'exceed',
  'exchange',
  'exclude',
  'excuse',
  'execute',
  'exercise',
  'exhaust',
  'exotic',
  'expand',
  'expect',
  'explain',
  'express',
  'extend',
  'extra',
  'eyebrow',
  'facility',
  'fact',
  'failure',
  'faint',
  'fake',
  'false',
  'family',
  'famous',
  'fancy',
  'fangs',
  'fantasy',
  'fatal',
  'fatigue',
  'favorite',
  'fawn',
  'fiber',
  'fiction',
  'filter',
  'finance',
  'findings',
  'finger',
  'firefly',
  'firm',
  'fiscal',
  'fishing',
  'fitness',
  'flame',
  'flash',
  'flavor',
  'flea',
  'flexible',
  'flip',
  'float',
  'floral',
  'fluff',
  'focus',
  'forbid',
  'force',
  'forecast',
  'forget',
  'formal',
  'fortune',
  'forward',
  'founder',
  'fraction',
  'fragment',
  'frequent',
  'freshman',
  'friar',
  'fridge',
  'friendly',
  'frost',
  'froth',
  'frozen',
  'fumes',
  'funding',
  'furl',
  'fused',
  'galaxy',
  'game',
  'garbage',
  'garden',
  'garlic',
  'gasoline',
  'gather',
  'general',
  'genius',
  'genre',
  'genuine',
  'geology',
  'gesture',
  'glad',
  'glance',
  'glasses',
  'glen',
  'glimpse',
  'goat',
  'golden',
  'graduate',
  'grant',
  'grasp',
  'gravity',
  'gray',
  'greatest',
  'grief',
  'grill',
  'grin',
  'grocery',
  'gross',
  'group',
  'grownup',
  'grumpy',
  'guard',
  'guest',
  'guilt',
  'guitar',
  'gums',
  'hairy',
  'hamster',
  'hand',
  'hanger',
  'harvest',
  'have',
  'havoc',
  'hawk',
  'hazard',
  'headset',
  'health',
  'hearing',
  'heat',
  'helpful',
  'herald',
  'herd',
  'hesitate',
  'hobo',
  'holiday',
  'holy',
  'home',
  'hormone',
  'hospital',
  'hour',
  'huge',
  'human',
  'humidity',
  'hunting',
  'husband',
  'hush',
  'husky',
  'hybrid',
  'idea',
  'identify',
  'idle',
  'image',
  'impact',
  'imply',
  'improve',
  'impulse',
  'include',
  'income',
  'increase',
  'index',
  'indicate',
  'industry',
  'infant',
  'inform',
  'inherit',
  'injury',
  'inmate',
  'insect',
  'inside',
  'install',
  'intend',
  'intimate',
  'invasion',
  'involve',
  'iris',
  'island',
  'isolate',
  'item',
  'ivory',
  'jacket',
  'jerky',
  'jewelry',
  'join',
  'judicial',
  'juice',
  'jump',
  'junction',
  'junior',
  'junk',
  'jury',
  'justice',
  'kernel',
  'keyboard',
  'kidney',
  'kind',
  'kitchen',
  'knife',
  'knit',
  'laden',
  'ladle',
  'ladybug',
  'lair',
  'lamp',
  'language',
  'large',
  'laser',
  'laundry',
  'lawsuit',
  'leader',
  'leaf',
  'learn',
  'leaves',
  'lecture',
  'legal',
  'legend',
  'legs',
  'lend',
  'length',
  'level',
  'liberty',
  'library',
  'license',
  'lift',
  'likely',
  'lilac',
  'lily',
  'lips',
  'liquid',
  'listen',
  'literary',
  'living',
  'lizard',
  'loan',
  'lobe',
  'location',
  'losing',
  'loud',
  'loyalty',
  'luck',
  'lunar',
  'lunch',
  'lungs',
  'luxury',
  'lying',
  'lyrics',
  'machine',
  'magazine',
  'maiden',
  'mailman',
  'main',
  'makeup',
  'making',
  'mama',
  'manager',
  'mandate',
  'mansion',
  'manual',
  'marathon',
  'march',
  'market',
  'marvel',
  'mason',
  'material',
  'math',
  'maximum',
  'mayor',
  'meaning',
  'medal',
  'medical',
  'member',
  'memory',
  'mental',
  'merchant',
  'merit',
  'method',
  'metric',
  'midst',
  'mild',
  'military',
  'mineral',
  'minister',
  'miracle',
  'mixed',
  'mixture',
  'mobile',
  'modern',
  'modify',
  'moisture',
  'moment',
  'morning',
  'mortgage',
  'mother',
  'mountain',
  'mouse',
  'move',
  'much',
  'mule',
  'multiple',
  'muscle',
  'museum',
  'music',
  'mustang',
  'nail',
  'national',
  'necklace',
  'negative',
  'nervous',
  'network',
  'news',
  'nuclear',
  'numb',
  'numerous',
  'nylon',
  'oasis',
  'obesity',
  'object',
  'observe',
  'obtain',
  'ocean',
  'often',
  'olympic',
  'omit',
  'oral',
  'orange',
  'orbit',
  'order',
  'ordinary',
  'organize',
  'ounce',
  'oven',
  'overall',
  'owner',
  'paces',
  'pacific',
  'package',
  'paid',
  'painting',
  'pajamas',
  'pancake',
  'pants',
  'papa',
  'paper',
  'parcel',
  'parking',
  'party',
  'patent',
  'patrol',
  'payment',
  'payroll',
  'peaceful',
  'peanut',
  'peasant',
  'pecan',
  'penalty',
  'pencil',
  'percent',
  'perfect',
  'permit',
  'petition',
  'phantom',
  'pharmacy',
  'photo',
  'phrase',
  'physics',
  'pickup',
  'picture',
  'piece',
  'pile',
  'pink',
  'pipeline',
  'pistol',
  'pitch',
  'plains',
  'plan',
  'plastic',
  'platform',
  'playoff',
  'pleasure',
  'plot',
  'plunge',
  'practice',
  'prayer',
  'preach',
  'predator',
  'pregnant',
  'premium',
  'prepare',
  'presence',
  'prevent',
  'priest',
  'primary',
  'priority',
  'prisoner',
  'privacy',
  'prize',
  'problem',
  'process',
  'profile',
  'program',
  'promise',
  'prospect',
  'provide',
  'prune',
  'public',
  'pulse',
  'pumps',
  'punish',
  'puny',
  'pupal',
  'purchase',
  'purple',
  'python',
  'quantity',
  'quarter',
  'quick',
  'quiet',
  'race',
  'racism',
  'radar',
  'railroad',
  'rainbow',
  'raisin',
  'random',
  'ranked',
  'rapids',
  'raspy',
  'reaction',
  'realize',
  'rebound',
  'rebuild',
  'recall',
  'receiver',
  'recover',
  'regret',
  'regular',
  'reject',
  'relate',
  'remember',
  'remind',
  'remove',
  'render',
  'repair',
  'repeat',
  'replace',
  'require',
  'rescue',
  'research',
  'resident',
  'response',
  'result',
  'retailer',
  'retreat',
  'reunion',
  'revenue',
  'review',
  'reward',
  'rhyme',
  'rhythm',
  'rich',
  'rival',
  'river',
  'robin',
  'rocky',
  'romantic',
  'romp',
  'roster',
  'round',
  'royal',
  'ruin',
  'ruler',
  'rumor',
  'sack',
  'safari',
  'salary',
  'salon',
  'salt',
  'satisfy',
  'satoshi',
  'saver',
  'says',
  'scandal',
  'scared',
  'scatter',
  'scene',
  'scholar',
  'science',
  'scout',
  'scramble',
  'screw',
  'script',
  'scroll',
  'seafood',
  'season',
  'secret',
  'security',
  'segment',
  'senior',
  'shadow',
  'shaft',
  'shame',
  'shaped',
  'sharp',
  'shelter',
  'sheriff',
  'short',
  'should',
  'shrimp',
  'sidewalk',
  'silent',
  'silver',
  'similar',
  'simple',
  'single',
  'sister',
  'skin',
  'skunk',
  'slap',
  'slavery',
  'sled',
  'slice',
  'slim',
  'slow',
  'slush',
  'smart',
  'smear',
  'smell',
  'smirk',
  'smith',
  'smoking',
  'smug',
  'snake',
  'snapshot',
  'sniff',
  'society',
  'software',
  'soldier',
  'solution',
  'soul',
  'source',
  'space',
  'spark',
  'speak',
  'species',
  'spelling',
  'spend',
  'spew',
  'spider',
  'spill',
  'spine',
  'spirit',
  'spit',
  'spray',
  'sprinkle',
  'square',
  'squeeze',
  'stadium',
  'staff',
  'standard',
  'starting',
  'station',
  'stay',
  'steady',
  'step',
  'stick',
  'stilt',
  'story',
  'strategy',
  'strike',
  'style',
  'subject',
  'submit',
  'sugar',
  'suitable',
  'sunlight',
  'superior',
  'surface',
  'surprise',
  'survive',
  'sweater',
  'swimming',
  'swing',
  'switch',
  'symbolic',
  'sympathy',
  'syndrome',
  'system',
  'tackle',
  'tactics',
  'tadpole',
  'talent',
  'task',
  'taste',
  'taught',
  'taxi',
  'teacher',
  'teammate',
  'teaspoon',
  'temple',
  'tenant',
  'tendency',
  'tension',
  'terminal',
  'testify',
  'texture',
  'thank',
  'that',
  'theater',
  'theory',
  'therapy',
  'thorn',
  'threaten',
  'thumb',
  'thunder',
  'ticket',
  'tidy',
  'timber',
  'timely',
  'ting',
  'tofu',
  'together',
  'tolerate',
  'total',
  'toxic',
  'tracks',
  'traffic',
  'training',
  'transfer',
  'trash',
  'traveler',
  'treat',
  'trend',
  'trial',
  'tricycle',
  'trip',
  'triumph',
  'trouble',
  'true',
  'trust',
  'twice',
  'twin',
  'type',
  'typical',
  'ugly',
  'ultimate',
  'umbrella',
  'uncover',
  'undergo',
  'unfair',
  'unfold',
  'unhappy',
  'union',
  'universe',
  'unkind',
  'unknown',
  'unusual',
  'unwrap',
  'upgrade',
  'upstairs',
  'username',
  'usher',
  'usual',
  'valid',
  'valuable',
  'vampire',
  'vanish',
  'various',
  'vegan',
  'velvet',
  'venture',
  'verdict',
  'verify',
  'very',
  'veteran',
  'vexed',
  'victim',
  'video',
  'view',
  'vintage',
  'violence',
  'viral',
  'visitor',
  'visual',
  'vitamins',
  'vocal',
  'voice',
  'volume',
  'voter',
  'voting',
  'walnut',
  'warmth',
  'warn',
  'watch',
  'wavy',
  'wealthy',
  'weapon',
  'webcam',
  'welcome',
  'welfare',
  'western',
  'width',
  'wildlife',
  'window',
  'wine',
  'wireless',
  'wisdom',
  'withdraw',
  'wits',
  'wolf',
  'woman',
  'work',
  'worthy',
  'wrap',
  'wrist',
  'writing',
  'wrote',
  'year',
  'yelp',
  'yield',
  'yoga',
  'zero'
];

const WORD_LIST_MAP = WORD_LIST.reduce((obj, val, idx) => {
  obj[val] = idx;
  return obj;
}, {});

exports = module.exports = {
  MIN_ENTROPY_BITS,
  generateIdentifier,
  encodeMnemonic,
  validateMnemonic,
  splitSecret,
  combineMnemonics,
  crypt,
  bitsToBytes
};
