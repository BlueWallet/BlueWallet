import * as bitcoin from 'bitcoinjs-lib';
import ecc from '../../blue_modules/noble_ecc';
import { BlueURDecoder, decodeUR } from '../../blue_modules/ur';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { combinePSBTs } from '../../util/combinePSBTs';
import fixture from '../fixtures/multisig-signing.json';

const decodePsbt = parts => {
  const decoder = new BlueURDecoder();
  parts.forEach(part => decoder.receivePart(part));
  expect(decoder.isComplete()).toBe(true);
  return decoder.toString();
};

it('combines the Detox hardware signatures with an unsigned PSBT without live UTXOs', () => {
  const wallet = new MultisigHDWallet();
  wallet.setSecret(Buffer.from(decodeUR(fixture.setupUr), 'hex').toString());
  expect(wallet.getBalance()).toBe(0);
  expect(wallet.howManySignaturesCanWeMake()).toBe(0);

  const unsigned = bitcoin.Psbt.fromBase64(fixture.unsignedPsbt);
  expect(wallet.calculateHowManySignaturesWeHaveFromPsbt(unsigned)).toBe(0);
  const partial = combinePSBTs({ psbtBase64: fixture.unsignedPsbt, newPSBTBase64: decodePsbt(fixture.passportUr) });
  expect(wallet.calculateHowManySignaturesWeHaveFromPsbt(partial)).toBe(1);
  const complete = combinePSBTs({ psbtBase64: partial.toBase64(), newPSBTBase64: decodePsbt(fixture.fullySignedUr) });
  expect(wallet.calculateHowManySignaturesWeHaveFromPsbt(complete)).toBe(2);
  expect(complete.validateSignaturesOfAllInputs((pubkey, hash, signature) => ecc.verify(hash, pubkey, signature))).toBe(true);

  const transaction = complete.finalizeAllInputs().extractTransaction();
  expect(transaction.ins).toHaveLength(1);
  expect(transaction.outs).toHaveLength(2);
  expect(bitcoin.address.fromOutputScript(transaction.outs[0].script)).toBe('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
  expect(transaction.outs[0].value).toBe(50000n);
});
