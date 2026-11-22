/**
 * The DePIN pubkey-reveal burn with UTXOs as the wallet service returns them:
 * without a prevout script. Both signers must sign over the real P2PKH script,
 * or the node rejects the spend (mandatory-script-verify-flag-failed).
 */
import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { encodeDestinationScript } from '@neuraiproject/neurai-create-transaction';

import { deriveDepinChatIdentity } from '../../blue_modules/neurai/depinChatIdentity';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';

const sdk: any = require('@neuraiproject/neurai-depin-msg');

const KNOWN_MNEMONIC = 'result pact model attract result puzzle final boss private educate luggage era';
const BURN = 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy';
const identity = deriveDepinChatIdentity({ network: 'xna-test', mnemonic: KNOWN_MNEMONIC });
const utxo = {
  txid: '7835a810b870c3e63f8c84fbfc847c737f285d31c0ddd17c2d193986acf6cb0e',
  outputIndex: 0,
  satoshis: 100_000_000n,
  address: identity.address,
  assetName: 'XNA',
  // What WssBackend returns: no script.
  script: '',
};

/** A device that signs any digest with `privHex`, as `depin_sign_digest` does. */
function device(privHex: string) {
  const priv = Buffer.from(privHex, 'hex');
  const signed: string[] = [];
  return {
    signed,
    depinSignDigest: async (digestHex: string) => {
      signed.push(digestHex);
      const compact = secp256k1.sign(Buffer.from(digestHex, 'hex'), priv, { prehash: false });
      const der = bitcoin.script.signature.encode(Buffer.from(compact), 1).subarray(0, -1);
      return { status: 'success', signature: Buffer.from(der).toString('hex'), pubkey: Buffer.from(secp256k1.getPublicKey(priv, true)).toString('hex') };
    },
  };
}

/** True when input 0 carries a signature valid over the real P2PKH scriptCode. */
function spendsCorrectly(signedHex: string): boolean {
  const tx = bitcoin.Transaction.fromHex(signedHex);
  const [sigWithType, pubkey] = bitcoin.script.decompile(tx.ins[0].script) as Buffer[];
  const { signature, hashType } = bitcoin.script.signature.decode(sigWithType);
  const sighash = tx.hashForSignature(0, Buffer.from(encodeDestinationScript(identity.address)), hashType);
  return secp256k1.verify(signature, sighash, pubkey, { prehash: false } as never);
}

const wallet = () => NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);

it('a device signs the reveal over the real P2PKH script, not an empty one', async () => {
  const hw = device(await sdk.wifToHex(identity.wif));
  const built = await wallet().buildDepinPubkeyRevealTransaction({
    depinAddress: identity.address,
    depinWif: '',
    utxos: [utxo],
    burnAddress: BURN,
    amountSats: 10_000_000n,
    device: hw as never,
  });
  assert.strictEqual(hw.signed.length, 1);
  assert.ok(spendsCorrectly(built.signedHex));
  const tx = bitcoin.Transaction.fromHex(built.signedHex);
  assert.strictEqual(BigInt(tx.outs[0].value), 10_000_000n);
  assert.strictEqual(BigInt(tx.outs[1].value), 100_000_000n - 10_000_000n - built.feeSats);
});

it('the software signer accepts the same script-less UTXO', async () => {
  const built = await wallet().buildDepinPubkeyRevealTransaction({
    depinAddress: identity.address,
    depinWif: identity.wif,
    utxos: [utxo],
    burnAddress: BURN,
    amountSats: 10_000_000n,
  });
  assert.ok(spendsCorrectly(built.signedHex));
});

it('refuses a device whose key does not control the DePIN address', async () => {
  await assert.rejects(
    wallet().buildDepinPubkeyRevealTransaction({
      depinAddress: identity.address,
      depinWif: '',
      utxos: [utxo],
      burnAddress: BURN,
      amountSats: 10_000_000n,
      device: device('42'.repeat(32)) as never,
    }),
    /does not control the DePIN address/,
  );
});
