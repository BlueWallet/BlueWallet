import assert from 'assert';

import * as c from '../../blue_modules/encryption';
import LIBSODIUM from './fixtures/nw2-libsodium-vectors.json';

describe('unit - encryption', function () {
  it('encrypts and decrypts', function () {
    const data2encrypt = 'really long data string bla bla really long data string bla bla really long data string bla bla';
    const crypted = c.encrypt(data2encrypt, 'password');
    const decrypted = c.decrypt(crypted, 'password');

    assert.ok(crypted);
    assert.ok(decrypted);
    assert.strictEqual(decrypted, data2encrypt);
    assert.ok(crypted !== data2encrypt);

    let decryptedWithBadPassword;
    try {
      decryptedWithBadPassword = c.decrypt(crypted, 'passwordBad');
    } catch (e) {}
    assert.ok(!decryptedWithBadPassword);

    let exceptionRaised = false;
    try {
      c.encrypt('yolo', 'password');
    } catch (_) {
      exceptionRaised = true;
    }
    assert.ok(exceptionRaised);
  });

  it('handles ok malformed data', function () {
    const decrypted = c.decrypt(
      'U2FsdGVkX1/OSNdi0JrLANn9qdNEiXgP20MJgT13CMKC7xKe+sb7x0An6r8lzrYeL2vjoPm2Xi5I3UdBcsgjgh0TR4PypNdDaW1tW8LhFH1wVCh1hacrFsJjoKMBmdCn4IVMwtIffGPptqBrGZl+6kjOc3BBbgq4uaAavFIwTS86WdaRt9qAboBcoPJZxsj37othbZfZfl2GBTCWnR1tOYAbElKWv4lBwNQpX7HqX3wTQkAbamBslsH5FfZRY1c38lOHrZMwNSyxhgspydksTxKkhPqWQu3XWT4GpRoRuVvYlBNvJOCUu2JbiVSp4NiOMSfnA8ahvpCGRNy+qPWsXqmJtz9BwyzedzDkgg6QOqxXz4oOeEJa/XLKiuv3ItsLrZb+sSA6wjB1Cx6/Oh2vW7eiHjCITeC7KUK1fAxVwufLcprNkvG8qFzkOcHxDyzG+sNL0cMipAxhpMX7qIcYcZFoLYkQRQHpOZKZCIAdNTfPGJ7M4cxGM0V+Uuirjyn+KAPJwNElwmPpX8sTQyEqlIlEwVjFXBpz28N5RAGN2zzCzEjD8NVYQJ2QyHj0gfWe',
      'fakePassword',
    );
    assert.ok(!decrypted);
  });

  it('can decrypt cipher created by CryptoJS@3.1.9-1', () => {
    const data2decrypt = 'really long data string bla bla really long data string bla bla really long data string bla bla';
    const crypted =
      'U2FsdGVkX19fJ4PcLum+tmBpEVNgGGsGKOhRS21cEcYAox+Df8VqmnnG9t2PvpM05eWImCRArorVUUegtcfSq314WMFzxKmiPIl9eqV1aOY+VFGuIBx0VIVsCWix2Q7sRZZwnOVpG5bdveZI0+Azyw==';
    const decrypted = c.decrypt(crypted, 'password');
    assert.deepEqual(data2decrypt, decrypted);
  });
});

/**
 * H08 · The `nw2:` format: argon2id (64 MiB, 3 passes) and XChaCha20-Poly1305
 * through libsodium. The vectors below were made by the vendored libsodium
 * itself (android/walletcrypto, built for the host), so they pin the format
 * and prove the test double computes what the phone computes.
 */
describe('unit - encryption, nw2 format', () => {
  const double = jest.requireActual<typeof import('./helpers/wallet-crypto-double')>('./helpers/wallet-crypto-double');
  const { salt: SALT, nonce: NONCE, vectors: LIBSODIUM_VECTORS } = LIBSODIUM;
  const PLAIN = '{"wallets":["one wallet"],"tx_metadata":{},"counterparty_metadata":{}}';

  const header = (bucket: string) => JSON.parse(Buffer.from(bucket.slice(4, bucket.indexOf('.')), 'base64url').toString());
  const withHeader = (bucket: string, edit: (h: Record<string, unknown>) => unknown) => {
    const h = header(bucket);
    edit(h);
    return `nw2:${Buffer.from(JSON.stringify(h)).toString('base64url')}${bucket.slice(bucket.indexOf('.'))}`;
  };

  it.each(LIBSODIUM_VECTORS)('opens the libsodium vector ($t passes, $m KiB)', vector => {
    expect(double.default.deriveKey(Buffer.from(vector.password).toString('base64url'), SALT, vector.t, vector.m)).toBe(vector.key);
    const [aad, body] = vector.bucket.split('.');
    expect(double.default.seal(vector.key, NONCE, vector.plaintext, aad)).toBe(body);
    expect(c.decrypt(vector.bucket, vector.password)).toBe(vector.plaintext);
    expect(c.decrypt(vector.bucket, `${vector.password}x`)).toBe(false);
  });

  it('writes the header it documents, with a new salt and nonce, and today’s cost', () => {
    const bucket = c.encrypt(PLAIN, 'pw-1234567', { format: 'nw2' });
    expect(c.bucketFormat(bucket)).toBe('nw2');
    const h = header(bucket);
    expect(Object.keys(h)).toEqual(['v', 'kdf', 't', 'm', 'p', 'salt', 'nonce']);
    expect(h).toMatchObject({ v: 2, kdf: 'argon2id', t: 3, m: 65536, p: 1 });
    expect(Buffer.from(h.salt, 'base64url')).toHaveLength(16);
    expect(Buffer.from(h.nonce, 'base64url')).toHaveLength(24);
    expect(c.decrypt(bucket, 'pw-1234567')).toBe(PLAIN);
    const other = header(c.encrypt(PLAIN, 'pw-1234567', { format: 'nw2' }));
    expect(other.salt).not.toBe(h.salt);
    expect(other.nonce).not.toBe(h.nonce);
  });

  it('a save with the session key keeps the salt with a new nonce, and derives nothing', () => {
    double.derivations.length = 0;
    const first = c.sealBucket(PLAIN, 'pw-1234567', { format: 'nw2' });
    const opened = c.openBucket(first.bucket, 'pw-1234567', first.key);
    expect(opened && opened.plaintext).toBe(PLAIN);
    const second = c.sealBucket(`${PLAIN} `, 'pw-1234567', { like: first.bucket, key: opened ? opened.key : null });
    expect(header(second.bucket).salt).toBe(header(first.bucket).salt);
    expect(header(second.bucket).nonce).not.toBe(header(first.bucket).nonce);
    expect(c.decrypt(second.bucket, 'pw-1234567', second.key)).toBe(`${PLAIN} `);
    expect(double.derivations).toHaveLength(1);
  });

  it('keeps no keys of its own: a wrong password returns nothing, and every open without a key derives', () => {
    const { bucket, password } = LIBSODIUM_VECTORS[1];
    double.derivations.length = 0;
    expect(c.openBucket(bucket, 'a near miss of the password')).toBe(false);
    const opened = c.openBucket(bucket, password);
    expect(opened && opened.key).toMatchObject({ salt: SALT, t: 2, m: 19456, p: 1 });
    expect(c.openBucket(bucket, password)).toBeTruthy();
    expect(double.derivations).toHaveLength(3);
    // The session's key opens it without a derivation; a key for another salt is not used.
    expect(c.openBucket(bucket, password, opened ? opened.key : null)).toBeTruthy();
    expect(double.derivations).toHaveLength(3);
    const other = c.sealBucket(PLAIN, password, { format: 'nw2' }).key;
    expect(c.openBucket(bucket, password, other)).toBeTruthy();
    expect(double.derivations).toHaveLength(5);
  });

  it('a bucket written with another cost moves to today’s cost with a new salt', () => {
    const older = LIBSODIUM_VECTORS[1];
    const next = c.encrypt(PLAIN, older.password, { like: older.bucket });
    expect(header(next)).toMatchObject({ t: 3, m: 65536 });
    expect(header(next).salt).not.toBe(SALT);
    expect(c.decrypt(next, older.password)).toBe(PLAIN);
  });

  it('a CryptoJS bucket is saved as CryptoJS until it is moved', () => {
    const legacy = c.encrypt(PLAIN, 'pw');
    expect(c.bucketFormat(legacy)).toBe('cryptojs');
    expect(c.bucketFormat(c.encrypt(PLAIN, 'pw', { like: legacy }))).toBe('cryptojs');
  });

  it('refuses altered, truncated or out-of-range buckets as a wrong password', () => {
    const { bucket, password, plaintext } = LIBSODIUM_VECTORS[1];
    const [aad, body] = bucket.split('.');
    const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
    expect(c.decrypt(bucket, password)).toBe(plaintext);
    // Tag, ciphertext, truncation.
    expect(c.decrypt(`${aad}.${flip(body, body.length - 3)}`, password)).toBe(false);
    expect(c.decrypt(`${aad}.${flip(body, 3)}`, password)).toBe(false);
    expect(c.decrypt(`${aad}.${body.slice(0, -4)}`, password)).toBe(false);
    expect(c.decrypt(`${aad}.`, password)).toBe(false);
    expect(c.decrypt(aad, password)).toBe(false);
    // The header is authenticated: a lower cost, another nonce or salt, an extra field.
    const edited = (edit: (h: Record<string, unknown>) => unknown) => c.decrypt(withHeader(bucket, edit), password);
    expect(edited(h => (h.t = 3))).toBe(false);
    expect(edited(h => (h.nonce = SALT + 'AAAAAAAAAA'))).toBe(false);
    expect(edited(h => (h.extra = 1))).toBe(false);
    // Out of what a reader accepts, before any derivation.
    double.derivations.length = 0;
    expect(edited(h => (h.m = 4 * 1024 * 1024))).toBe(false);
    expect(edited(h => (h.m = 1024))).toBe(false);
    expect(edited(h => (h.t = 50))).toBe(false);
    expect(edited(h => (h.p = 2))).toBe(false);
    expect(edited(h => (h.v = 3))).toBe(false);
    expect(edited(h => (h.kdf = 'scrypt'))).toBe(false);
    expect(edited(h => (h.salt = 'AAEC'))).toBe(false);
    expect(c.decrypt('nw2:not base64!.abc', password)).toBe(false);
    expect(c.decrypt('nw2:', password)).toBe(false);
    expect(double.derivations).toHaveLength(0);
  });

  it('without the native module: CryptoJS still works, nw2 cannot be read or written', () => {
    // As on iOS today: the module is absent.
    const native = jest.requireMock<{ default: unknown }>('../../codegen/NativeWalletCrypto');
    const real = native.default;
    native.default = null;
    try {
      expect(c.strongEncryptionAvailable()).toBe(false);
      expect(c.decrypt(c.encrypt(PLAIN, 'pw'), 'pw')).toBe(PLAIN);
      expect(() => c.decrypt(LIBSODIUM_VECTORS[0].bucket, LIBSODIUM_VECTORS[0].password)).toThrow(/not available/);
      expect(() => c.encrypt(PLAIN, 'pw', { format: 'nw2' })).toThrow(/not available/);
    } finally {
      native.default = real;
    }
    expect(c.strongEncryptionAvailable()).toBe(true);
  });
});
