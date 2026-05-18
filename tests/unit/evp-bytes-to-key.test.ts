import assert from 'assert';

import { evpBytesToKeyMd5 } from '../../blue_modules/crypto/evp_bytes_to_key';
import { hexToUint8Array, stringToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

describe('evpBytesToKeyMd5', () => {
  // Vectors computed against the OpenSSL EVP_BytesToKey reference algorithm
  // (MD5, 1 iteration). The KDF is purely deterministic, so a single fixed
  // (password, salt) pair pins the bytes our wallet store relies on.
  it('matches the OpenSSL CLI reference for password="mypassword"', () => {
    // openssl enc -aes-256-cbc -k mypassword -S 0102030405060708 -md md5 -p
    const out = evpBytesToKeyMd5(stringToUint8Array('mypassword'), hexToUint8Array('0102030405060708'), 48);
    assert.strictEqual(uint8ArrayToHex(out.subarray(0, 32)), '20814c3ad75ac1d26c61a8e4702b5ff4d7baaee00c595bab71592aaf45bf41e4');
    assert.strictEqual(uint8ArrayToHex(out.subarray(32, 48)), '43269499cb6d59f4e3b9dda68098b673');
  });

  it('matches a Node-crypto reference vector for a multi-word password', () => {
    const out = evpBytesToKeyMd5(stringToUint8Array('correct horse'), hexToUint8Array('0102030405060708'), 48);
    assert.strictEqual(uint8ArrayToHex(out.subarray(0, 32)), 'bcf8d941d9291141709c9d56360eb7148e3960ab3dc44d832c4028568545c91d');
    assert.strictEqual(uint8ArrayToHex(out.subarray(32, 48)), '5a7a1d12207f801d2f6f4cf578e8708c');
  });

  it('returns exactly the requested number of bytes', () => {
    const pwd = stringToUint8Array('pw');
    const salt = hexToUint8Array('00000000000000ff');
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 1).length, 1);
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 15).length, 15);
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 16).length, 16); // one MD5 block exactly
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 17).length, 17); // one block + 1
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 48).length, 48); // key + iv default
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 65).length, 65); // multi-block + spillover
  });

  it('is a prefix-stable stream (same first N bytes regardless of total length)', () => {
    const pwd = stringToUint8Array('xyz');
    const salt = hexToUint8Array('cafebabedeadbeef');
    const long = evpBytesToKeyMd5(pwd, salt, 64);
    for (const n of [1, 16, 17, 32, 48]) {
      assert.strictEqual(uint8ArrayToHex(evpBytesToKeyMd5(pwd, salt, n)), uint8ArrayToHex(long.subarray(0, n)));
    }
  });

  it('rejects non-integer or negative byteLength', () => {
    const pwd = stringToUint8Array('pw');
    const salt = hexToUint8Array('0102030405060708');
    assert.throws(() => evpBytesToKeyMd5(pwd, salt, -1));
    assert.throws(() => evpBytesToKeyMd5(pwd, salt, 1.5));
    assert.throws(() => evpBytesToKeyMd5(pwd, salt, NaN));
    assert.strictEqual(evpBytesToKeyMd5(pwd, salt, 0).length, 0);
  });
});
