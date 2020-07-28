/* global it, describe, jasmine, afterAll, beforeAll */

const assert = require('assert');

global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment

global.net = require('net');

// eslint-disable-next-line import/order
const BlueElectrum = require('../../BlueElectrum');

// needed by Electrum client. For RN it is proviced in shim.js

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});
const i18n = require('../../loc');
const { mnemonicToKeyPair } = require('../crypto');

describe('Utils crypto', () => {
  describe('mnemonicToKeyPair', () => {
    it('should convert properly mnemonic to keyPair', async () => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;

      const mnemonic = 'couple update that engine praise oyster index debate skate tunnel artefact minimum';
      const keyPair = await mnemonicToKeyPair(mnemonic);

      const { privateKey } = keyPair;

      assert.strictEqual(
        'fd7166e4be04e93bf1dae5a18eac77caf241e4db24aa82f3d544ae7b6161fd71',
        privateKey.toString('hex'),
      );
    });

    it('should throw error when mnemonic has too much words', async () => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      const mnemonic = 'print crystal program squirrel before fault cause face play inherit minor bean bean';
      try {
        await mnemonicToKeyPair(mnemonic);
      } catch (e) {
        expect(e.message).toBe(
          i18n.formatString(i18n.wallets.errors.invalidMnemonicWordsNumber, {
            receivedWordsNumber: 13,
            expectedWordsNumber: 12,
          }),
        );
      }
    });

    it('should throw error when mnemonic has word that doesnt has index', async () => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      const nonExistingWord = 'nonExistingWord';
      const mnemonic = `print ${nonExistingWord} program squirrel before fault cause face play inherit minor bean`;
      try {
        await mnemonicToKeyPair(mnemonic);
      } catch (e) {
        expect(e.message).toBe(
          i18n.formatString(i18n.wallets.errors.noIndexForWord, {
            word: nonExistingWord,
          }),
        );
      }
    });
  });
});
