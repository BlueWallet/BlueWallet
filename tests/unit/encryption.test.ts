import assert from 'assert';

import * as c from '../../blue_modules/encryption';

jest.setTimeout(30 * 1000); // scrypt KDF (N=2^15) is ~200–400 ms per call

describe('unit - encryption', function () {
  it('encrypts and decrypts', async function () {
    const data2encrypt = 'really long data string bla bla really long data string bla bla really long data string bla bla';
    const crypted = await c.encrypt(data2encrypt, 'password');
    const decrypted = await c.decrypt(crypted, 'password');

    assert.ok(crypted);
    assert.ok(decrypted);
    assert.strictEqual(decrypted, data2encrypt);
    assert.ok(crypted !== data2encrypt);
    assert.ok(crypted.startsWith('v2:'), 'new encryptions must use the v2 envelope');

    const decryptedWithBadPassword = await c.decrypt(crypted, 'passwordBad');
    assert.strictEqual(decryptedWithBadPassword, false);

    let exceptionRaised = false;
    try {
      await c.encrypt('yolo', 'password');
    } catch (_) {
      exceptionRaised = true;
    }
    assert.ok(exceptionRaised);
  });

  it('handles ok malformed data', async function () {
    const decrypted = await c.decrypt(
      'U2FsdGVkX1/OSNdi0JrLANn9qdNEiXgP20MJgT13CMKC7xKe+sb7x0An6r8lzrYeL2vjoPm2Xi5I3UdBcsgjgh0TR4PypNdDaW1tW8LhFH1wVCh1hacrFsJjoKMBmdCn4IVMwtIffGPptqBrGZl+6kjOc3BBbgq4uaAavFIwTS86WdaRt9qAboBcoPJZxsj37othbZfZfl2GBTCWnR1tOYAbElKWv4lBwNQpX7HqX3wTQkAbamBslsH5FfZRY1c38lOHrZMwNSyxhgspydksTxKkhPqWQu3XWT4GpRoRuVvYlBNvJOCUu2JbiVSp4NiOMSfnA8ahvpCGRNy+qPWsXqmJtz9BwyzedzDkgg6QOqxXz4oOeEJa/XLKiuv3ItsLrZb+sSA6wjB1Cx6/Oh2vW7eiHjCITeC7KUK1fAxVwufLcprNkvG8qFzkOcHxDyzG+sNL0cMipAxhpMX7qIcYcZFoLYkQRQHpOZKZCIAdNTfPGJ7M4cxGM0V+Uuirjyn+KAPJwNElwmPpX8sTQyEqlIlEwVjFXBpz28N5RAGN2zzCzEjD8NVYQJ2QyHj0gfWe',
      'fakePassword',
    );
    assert.ok(!decrypted);
  });

  it('can decrypt cipher created by CryptoJS@3.1.9-1 (legacy v1 path)', async () => {
    const data2decrypt = 'really long data string bla bla really long data string bla bla really long data string bla bla';
    const crypted =
      'U2FsdGVkX19fJ4PcLum+tmBpEVNgGGsGKOhRS21cEcYAox+Df8VqmnnG9t2PvpM05eWImCRArorVUUegtcfSq314WMFzxKmiPIl9eqV1aOY+VFGuIBx0VIVsCWix2Q7sRZZwnOVpG5bdveZI0+Azyw==';
    const decrypted = await c.decrypt(crypted, 'password');
    assert.deepEqual(data2decrypt, decrypted);
  });

  it('can decrypt a ciphertext produced by the OpenSSL CLI (legacy v1 wire-format check)', async () => {
    // Regenerate this fixture with (copy-pasteable, verified to reproduce the byte string below):
    //
    //   { printf 'Salted__\x01\x02\x03\x04\x05\x06\x07\x08'; \
    //     printf 'hello world this is plaintext' \
    //       | openssl enc -aes-256-cbc -k mypassword -S 0102030405060708 -md md5; \
    //   } | base64
    //
    // OpenSSL's `enc` only emits the `Salted__` envelope when it picks the salt itself;
    // passing `-S <hex>` suppresses the header, so we prepend it manually. Pins the
    // on-disk format against an independent reference beyond crypto-js.
    const crypted = 'U2FsdGVkX18BAgMEBQYHCMqtJuZaneiHrVN/oMPPLvFplovZbI1K+lulGJn7NAvn';
    assert.strictEqual(await c.decrypt(crypted, 'mypassword'), 'hello world this is plaintext');
  });

  it('roundtrips multi-byte UTF-8 (emoji / CJK) under v2', async () => {
    const data = '日本語テスト 🌅🔥🌊 multi-byte plaintext ✅';
    const crypted = await c.encrypt(data, 'pässwörd中');
    assert.ok(crypted.startsWith('v2:'));
    const decrypted = await c.decrypt(crypted, 'pässwörd中');
    assert.strictEqual(decrypted, data);
  });

  it('returns false on tampered v2 ciphertext (AEAD auth-tag mismatch)', async () => {
    const crypted = await c.encrypt('legitimate payload bytes here', 'password');
    assert.ok(crypted.startsWith('v2:'));
    // Flip one base64 char near the end (inside the auth tag region) — must not decrypt
    const tampered = `${crypted.slice(0, -2)}${crypted.slice(-2) === 'AA' ? 'BB' : 'AA'}`;
    assert.strictEqual(await c.decrypt(tampered, 'password'), false);
  });

  it('returns false on empty / non-string input', async () => {
    assert.strictEqual(await c.decrypt('', 'password'), false);
    // @ts-expect-error — runtime guard for non-string input
    assert.strictEqual(await c.decrypt(undefined, 'password'), false);
  });
});
