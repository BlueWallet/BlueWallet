/* eslint-disable import/order */
const assert = require('assert');
const aes = require('browserify-aes');
const Buffer = require('safe-buffer').Buffer;
const bs58check = require('bs58check');
const createHash = require('create-hash');

const scrypt = require('./scryptsy');

const xor = require('buffer-xor/inplace');
const ecurve = require('ecurve');

const curve = ecurve.getCurveByName('secp256k1');

const BigInteger = require('bigi');

// constants
const SCRYPT_PARAMS = {
  N: 16384, // specified by BIP38
  r: 8,
  p: 8,
};
const NULL = Buffer.alloc(0);

function hash160(buffer) {
  return createHash('rmd160')
    .update(
      createHash('sha256')
        .update(buffer)
        .digest(),
    )
    .digest();
}

function hash256(buffer) {
  return createHash('sha256')
    .update(
      createHash('sha256')
        .update(buffer)
        .digest(),
    )
    .digest();
}

function getAddress(d, compressed) {
  const Q = curve.G.multiply(d).getEncoded(compressed);
  const hash = hash160(Q);
  const payload = Buffer.allocUnsafe(21);
  payload.writeUInt8(0x00, 0); // XXX TODO FIXME bitcoin only??? damn you BIP38
  hash.copy(payload, 1);

  return bs58check.encode(payload);
}

async function encryptRaw(buffer, compressed, passphrase, progressCallback, scryptParams) {
  if (buffer.length !== 32) throw new Error('Invalid private key length');
  scryptParams = scryptParams || SCRYPT_PARAMS;

  const d = BigInteger.fromBuffer(buffer);
  const address = getAddress(d, compressed);
  const secret = Buffer.from(passphrase, 'utf8');
  const salt = hash256(address).slice(0, 4);

  const N = scryptParams.N;
  const r = scryptParams.r;
  const p = scryptParams.p;

  const scryptBuf = await scrypt(secret, salt, N, r, p, 64, progressCallback);
  const derivedHalf1 = scryptBuf.slice(0, 32);
  const derivedHalf2 = scryptBuf.slice(32, 64);

  const xorBuf = xor(derivedHalf1, buffer);
  const cipher = aes.createCipheriv('aes-256-ecb', derivedHalf2, NULL);
  cipher.setAutoPadding(false);
  cipher.end(xorBuf);

  const cipherText = cipher.read();

  // 0x01 | 0x42 | flagByte | salt (4) | cipherText (32)
  const result = Buffer.allocUnsafe(7 + 32);
  result.writeUInt8(0x01, 0);
  result.writeUInt8(0x42, 1);
  result.writeUInt8(compressed ? 0xe0 : 0xc0, 2);
  salt.copy(result, 3);
  cipherText.copy(result, 7);

  return result;
}

function encrypt(buffer, compressed, passphrase, progressCallback, scryptParams) {
  return bs58check.encode(encryptRaw(buffer, compressed, passphrase, progressCallback, scryptParams));
}

// some of the techniques borrowed from: https://github.com/pointbiz/bitaddress.org
async function decryptRaw(buffer, passphrase, progressCallback, scryptParams) {
  // 39 bytes: 2 bytes prefix, 37 bytes payload
  if (buffer.length !== 39) throw new Error('Invalid BIP38 data length');
  if (buffer.readUInt8(0) !== 0x01) throw new Error('Invalid BIP38 prefix');
  scryptParams = scryptParams || SCRYPT_PARAMS;

  // check if BIP38 EC multiply
  const type = buffer.readUInt8(1);
  if (type === 0x43) return await decryptECMult(buffer, passphrase, progressCallback, scryptParams);
  if (type !== 0x42) throw new Error('Invalid BIP38 type');

  passphrase = Buffer.from(passphrase, 'utf8');

  const flagByte = buffer.readUInt8(2);
  const compressed = flagByte === 0xe0;
  if (!compressed && flagByte !== 0xc0) throw new Error('Invalid BIP38 compression flag');

  const N = scryptParams.N;
  const r = scryptParams.r;
  const p = scryptParams.p;

  const salt = buffer.slice(3, 7);
  const scryptBuf = await scrypt(passphrase, salt, N, r, p, 64, progressCallback);
  const derivedHalf1 = scryptBuf.slice(0, 32);
  const derivedHalf2 = scryptBuf.slice(32, 64);

  const privKeyBuf = buffer.slice(7, 7 + 32);
  const decipher = aes.createDecipheriv('aes-256-ecb', derivedHalf2, NULL);
  decipher.setAutoPadding(false);
  decipher.end(privKeyBuf);

  const plainText = decipher.read();
  const privateKey = xor(derivedHalf1, plainText);

  // verify salt matches address
  const d = BigInteger.fromBuffer(privateKey);
  const address = getAddress(d, compressed);
  const checksum = hash256(address).slice(0, 4);
  assert.deepEqual(salt, checksum);

  return {
    privateKey,
    compressed,
  };
}

async function decrypt(string, passphrase, progressCallback, scryptParams) {
  return await decryptRaw(bs58check.decode(string), passphrase, progressCallback, scryptParams);
}

async function decryptECMult(buffer, passphrase, progressCallback, scryptParams) {
  passphrase = Buffer.from(passphrase, 'utf8');
  buffer = buffer.slice(1); // FIXME: we can avoid this
  scryptParams = scryptParams || SCRYPT_PARAMS;

  const flag = buffer.readUInt8(1);
  const compressed = (flag & 0x20) !== 0;
  const hasLotSeq = (flag & 0x04) !== 0;

  assert.equal(flag & 0x24, flag, 'Invalid private key.');

  const addressHash = buffer.slice(2, 6);
  const ownerEntropy = buffer.slice(6, 14);
  let ownerSalt;

  // 4 bytes ownerSalt if 4 bytes lot/sequence
  if (hasLotSeq) {
    ownerSalt = ownerEntropy.slice(0, 4);

    // else, 8 bytes ownerSalt
  } else {
    ownerSalt = ownerEntropy;
  }

  const encryptedPart1 = buffer.slice(14, 22); // First 8 bytes
  const encryptedPart2 = buffer.slice(22, 38); // 16 bytes

  const N = scryptParams.N;
  const r = scryptParams.r;
  const p = scryptParams.p;
  const preFactor = await scrypt(passphrase, ownerSalt, N, r, p, 32, progressCallback);

  let passFactor;
  if (hasLotSeq) {
    const hashTarget = Buffer.concat([preFactor, ownerEntropy]);
    passFactor = hash256(hashTarget);
  } else {
    passFactor = preFactor;
  }

  const passInt = BigInteger.fromBuffer(passFactor);
  const passPoint = curve.G.multiply(passInt).getEncoded(true);

  const seedBPass = await scrypt(passPoint, Buffer.concat([addressHash, ownerEntropy]), 1024, 1, 1, 64);

  const derivedHalf1 = seedBPass.slice(0, 32);
  const derivedHalf2 = seedBPass.slice(32, 64);

  const decipher = aes.createDecipheriv('aes-256-ecb', derivedHalf2, Buffer.alloc(0));
  decipher.setAutoPadding(false);
  decipher.end(encryptedPart2);

  const decryptedPart2 = decipher.read();
  const tmp = xor(decryptedPart2, derivedHalf1.slice(16, 32));
  const seedBPart2 = tmp.slice(8, 16);

  const decipher2 = aes.createDecipheriv('aes-256-ecb', derivedHalf2, Buffer.alloc(0));
  decipher2.setAutoPadding(false);
  decipher2.write(encryptedPart1); // first 8 bytes
  decipher2.end(tmp.slice(0, 8)); // last 8 bytes

  const seedBPart1 = xor(decipher2.read(), derivedHalf1.slice(0, 16));
  const seedB = Buffer.concat([seedBPart1, seedBPart2], 24);
  const factorB = BigInteger.fromBuffer(hash256(seedB));

  // d = passFactor * factorB (mod n)
  const d = passInt.multiply(factorB).mod(curve.n);

  return {
    privateKey: d.toBuffer(32),
    compressed,
  };
}

function verify(string) {
  const decoded = bs58check.decodeUnsafe(string);
  if (!decoded) return false;

  if (decoded.length !== 39) return false;
  if (decoded.readUInt8(0) !== 0x01) return false;

  const type = decoded.readUInt8(1);
  const flag = decoded.readUInt8(2);

  // encrypted WIF
  if (type === 0x42) {
    if (flag !== 0xc0 && flag !== 0xe0) return false;

    // EC mult
  } else if (type === 0x43) {
    if (flag & ~0x24) return false;
  } else {
    return false;
  }

  return true;
}

module.exports = {
  decrypt,
  decryptECMult,
  decryptRaw,
  encrypt,
  encryptRaw,
  verify,
};
