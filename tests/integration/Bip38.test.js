/* global it, jasmine */
let assert = require('assert');

it('bip38 decodes', async () => {
  const bip38 = require('../../bip38');
  const wif = require('wif');

  let encryptedKey = '6PRVWUbkzq2VVjRuv58jpwVjTeN46MeNmzUHqUjQptBJUHGcBakduhrUNc';
  let decryptedKey = await bip38.decrypt(
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
  if (process.env.USER === 'burn' || process.env.USER === 'igor' || process.env.USER === 'overtorment') {
    // run only on circleCI
    return;
  }
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  const bip38 = require('../../bip38');
  const wif = require('wif');

  let encryptedKey = '6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN';
  let decryptedKey = await bip38.decrypt(encryptedKey, 'qwerty', status => process.stdout.write(parseInt(status.percent) + '%\r'));

  assert.strictEqual(
    wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed),
    'KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc',
  );
});
