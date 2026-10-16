import assert from 'assert';
import { Transaction, payments, script } from 'bitcoinjs-lib';
import { ADDRESS, FUNDING_TXID, VALUES } from './electrum';

export const assertFixtureTransactionSigned = async (tx: Transaction) => {
  const { verify } = await import('@noble/secp256k1');
  assert.ok(tx.ins.length > 0);
  for (const [index, input] of tx.ins.entries()) {
    assert.strictEqual(Buffer.from(input.hash).reverse().toString('hex'), FUNDING_TXID);
    assert.strictEqual(input.witness.length, 2, 'Every P2WPKH input must be signed');
    const [encodedSignature, pubkey] = input.witness;
    assert.strictEqual(payments.p2wpkh({ pubkey }).address, ADDRESS);
    const signature = script.signature.decode(encodedSignature);
    assert.strictEqual(signature.hashType, Transaction.SIGHASH_ALL);
    const hash = tx.hashForWitnessV0(index, payments.p2pkh({ pubkey }).output!, BigInt(VALUES[input.index]), signature.hashType);
    assert.ok(verify(signature.signature, hash, pubkey, { prehash: false }), 'Input signature must verify against its fixture UTXO');
  }
  const inputValue = tx.ins.reduce((sum, input) => sum + VALUES[input.index], 0);
  const outputValue = tx.outs.reduce((sum, output) => sum + Number(output.value), 0);
  assert.strictEqual(Math.round((inputValue - outputValue) / tx.virtualSize()), 2);
};
