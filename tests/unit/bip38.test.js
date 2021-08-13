const assert = require('assert');

it('bip38 decodes', async () => {
  const bip38 = require('../../blue_modules/bip38');
  const wif = require('wif');

  const encryptedKey = '6PRVWUbkzq2VVjRuv58jpwVjTeN46MeNmzUHqUjQptBJUHGcBakduhrUNc';
  const decryptedKey = await bip38.decrypt(
    encryptedKey,
    'TestingOneTwoThree',
    () => {},
    { N: 1, r: 8, p: 8 }, // using non-default parameters to speed it up (not-bip38 compliant)
  );

  assert.strictEqual(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    '5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR',
  );
});

it('bip38 decodes slow', async () => {
  if (!(process.env.CI || process.env.TRAVIS)) {
    // run only on CI
    return;
  }
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
  const bip38 = require('../../blue_modules/bip38');
  const wif = require('wif');

  const encryptedKey = '6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN';
  let callbackWasCalled = false;
  const decryptedKey = await bip38.decrypt(encryptedKey, 'qwerty', () => {
    // callbacks make sense only with pure js scrypt implementation (nodejs and browsers).
    // on RN scrypt is handled by native module and takes ~4 secs
    callbackWasCalled = true;
  });
  assert.ok(callbackWasCalled);

  assert.strictEqual(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    'KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc',
  );

  let wasError = false;
  try {
    await bip38.decrypt(encryptedKey, 'a');
  } catch (_) {
    wasError = true;
  }

  assert.ok(wasError);
});
