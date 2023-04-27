import { LegacyWallet } from '../../class';
import { ECPairFactory } from 'ecpair';
import ecc from '../../blue_modules/noble_ecc';
const ECPair = ECPairFactory(ecc);
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

describe('Legacy wallet', () => {
  it('can validate addresses', () => {
    const w = new LegacyWallet();
    assert.ok(w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
    assert.ok(!w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2j'));
    assert.ok(w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2'));
    assert.ok(!w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUo'));
    assert.ok(!w.isAddressValid('12345'));
    assert.ok(w.isAddressValid('bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm'));
    assert.ok(w.isAddressValid('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7'));

    // taproot:
    assert.ok(!w.isAddressValid('bc1pw5dgrnzv')); // v1, data length != 32
    assert.ok(!w.isAddressValid('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav')); // v1, data length != 32
    assert.ok(!w.isAddressValid('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd')); // P2TR example with errors (using Bech32 instead of Bech32m)
    assert.ok(!w.isAddressValid('bc1p38j9r5y49hruaue7wxjce0updqjuyyx0kh56v8s25huc6995vvpql3jow4')); // invalid char
    assert.ok(!w.isAddressValid('BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R')); // invalid char
    assert.ok(!w.isAddressValid('bc1pllllllllllllllllllllllllllllllllllllllllllllallllscqlhrddu')); // X is modulo P + 1 (invalid X, but 1 is valid, testing if wrapped modulo (P+1 mod P === 1) will pass)
    assert.ok(!w.isAddressValid('bc1pllllllllllllllllllllllllllllllllllllllllllllallllshqcgyklh')); // X is modulo P - 1 (invalid X)
    assert.ok(!w.isAddressValid('bc1pqtllllllllllllllllllllllllllllllllllllllllllllhlll7zcsqylfl')); // data length is 33 (valid point in compressed DER format (33 bytes))
    assert.ok(!w.isAddressValid('bc1plllllllllllllllllllllllllllllllllllllllllll0lllu9cegrnmx')); // data is length 31 (valid X value with leading 0x00 trimmed)

    assert.ok(w.isAddressValid('bc1pw38ttcljvgv9x64xpsq99dl9auy8vv50n25xcstuj2cagzcpx3us2m25kg'));
    assert.ok(w.isAddressValid('bc1pqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsyjer9e'));
    assert.ok(w.isAddressValid('bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9'));
    assert.ok(w.isAddressValid('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'));

    assert.ok(!w.isAddressValid('BC1SW50QGDZ25J')); // v16, valid but unsafe
    assert.ok(!w.isAddressValid('bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs')); // v2, valid but unsafe
  });

  it('can create transaction', async () => {
    const l = new LegacyWallet();
    l.setSecret('L4ccWrPMmFDZw4kzAKFqJNxgHANjdy6b7YKNXMwB4xac4FLF3Tov');
    assert.strictEqual(l.getAddress(), '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M');
    assert.deepStrictEqual(l.getAllExternalAddresses(), ['14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M']);
    assert.strictEqual(await l.getChangeAddressAsync(), l.getAddress());

    const utxos = [
      {
        txid: 'cc44e933a094296d9fe424ad7306f16916253a3d154d52e4f1a757c18242cec4',
        vout: 0,
        value: 100000,
        txhex:
          '0200000000010161890cd52770c150da4d7d190920f43b9f88e7660c565a5a5ad141abb6de09de00000000000000008002a0860100000000001976a91426e01119d265aa980390c49eece923976c218f1588ac3e17000000000000160014c1af8c9dd85e0e55a532a952282604f820746fcd02473044022072b3f28808943c6aa588dd7a4e8f29fad7357a2814e05d6c5d767eb6b307b4e6022067bc6a8df2dbee43c87b8ce9ddd9fe678e00e0f7ae6690d5cb81eca6170c47e8012102e8fba5643e15ab70ec79528833a2c51338c1114c4eebc348a235b1a3e13ab07100000000',
      },
    ];
    // ^^ only non-segwit inputs need full transaction txhex

    let txNew = l.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, l.getAddress());
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    const satPerVbyte = txNew.fee / tx.virtualSize();
    assert.strictEqual(satPerVbyte, 1);
    assert.strictEqual(
      txNew.tx.toHex(),
      '0200000001c4ce4282c157a7f1e4524d153d3a251669f10673ad24e49f6d2994a033e944cc000000006b48304502210091e58bd2021f2eeea8d39d7f7b053c9ccc52a747b60f1c3584ba33285e2d150602205b2d35a2536cbe157015e8c54a26f5fc350cc7c72b5ca80b9e548917993f652201210337c09b3cb889801638078fd4e6998218b28c92d338ea2602720a88847aedceb3ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac2e260000000000001976a91426e01119d265aa980390c49eece923976c218f1588ac00000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual(l.getAddress(), bitcoin.address.fromOutputScript(tx.outs[1].script)); // change address

    // sendMax
    txNew = l.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, l.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address

    // batch send + send max
    txNew = l.createTransaction(
      utxos,
      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: 'bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe', value: 10000 }],
      1,
      l.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual('bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe', bitcoin.address.fromOutputScript(tx.outs[1].script)); // to address
  });

  it('can create transaction with better UTXO selection', async () => {
    const l = new LegacyWallet();
    l.setSecret('L4ccWrPMmFDZw4kzAKFqJNxgHANjdy6b7YKNXMwB4xac4FLF3Tov');

    const utxos = [
      {
        txid: 'cc44e933a094296d9fe424ad7306f16916253a3d154d52e4f1a757c18242cec4',
        vout: 0,
        value: 1000,
        txhex:
          '0200000000010161890cd52770c150da4d7d190920f43b9f88e7660c565a5a5ad141abb6de09de00000000000000008002a0860100000000001976a91426e01119d265aa980390c49eece923976c218f1588ac3e17000000000000160014c1af8c9dd85e0e55a532a952282604f820746fcd02473044022072b3f28808943c6aa588dd7a4e8f29fad7357a2814e05d6c5d767eb6b307b4e6022067bc6a8df2dbee43c87b8ce9ddd9fe678e00e0f7ae6690d5cb81eca6170c47e8012102e8fba5643e15ab70ec79528833a2c51338c1114c4eebc348a235b1a3e13ab07100000000',
      },
      {
        txid: 'cc44e933a094296d9fe424ad7306f16916253a3d154d52e4f1a757c18242cec4',
        vout: 1,
        value: 1000,
        txhex:
          '0200000000010161890cd52770c150da4d7d190920f43b9f88e7660c565a5a5ad141abb6de09de00000000000000008002a0860100000000001976a91426e01119d265aa980390c49eece923976c218f1588ac3e17000000000000160014c1af8c9dd85e0e55a532a952282604f820746fcd02473044022072b3f28808943c6aa588dd7a4e8f29fad7357a2814e05d6c5d767eb6b307b4e6022067bc6a8df2dbee43c87b8ce9ddd9fe678e00e0f7ae6690d5cb81eca6170c47e8012102e8fba5643e15ab70ec79528833a2c51338c1114c4eebc348a235b1a3e13ab07100000000',
      },

      {
        txid: 'cc44e933a094296d9fe424ad7306f16916253a3d154d52e4f1a757c18242cec4',
        vout: 2,
        value: 69000000,
        txhex:
          '0200000000010161890cd52770c150da4d7d190920f43b9f88e7660c565a5a5ad141abb6de09de00000000000000008002a0860100000000001976a91426e01119d265aa980390c49eece923976c218f1588ac3e17000000000000160014c1af8c9dd85e0e55a532a952282604f820746fcd02473044022072b3f28808943c6aa588dd7a4e8f29fad7357a2814e05d6c5d767eb6b307b4e6022067bc6a8df2dbee43c87b8ce9ddd9fe678e00e0f7ae6690d5cb81eca6170c47e8012102e8fba5643e15ab70ec79528833a2c51338c1114c4eebc348a235b1a3e13ab07100000000',
      },
    ];
    // ^^ only non-segwit inputs need full transaction txhex

    const { psbt } = l.createTransaction(
      utxos,
      [{ value: 60000000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }],
      1,
      l.getAddress(),
      0,
      true,
    );
    assert.strictEqual(psbt.data.inputs.length, 1);
  });

  it("throws error if you can't create wallet from this entropy", async () => {
    const l = new LegacyWallet();
    const zeroes = [...Array(32)].map(() => 0);
    await assert.rejects(async () => await l.generateFromEntropy(Buffer.from(zeroes)), {
      name: 'TypeError',
      message: 'Private key not in range [1, n)',
    });
  });

  it('can consume user generated entropy', async () => {
    const l = new LegacyWallet();
    const values = [...Array(32)].map(() => 1);
    await l.generateFromEntropy(Buffer.from(values));
    assert.strictEqual(l.getSecret(), 'KwFfNUhSDaASSAwtG7ssQM1uVX8RgX5GHWnnLfhfiQDigjioWXHH');
  });

  it('can fullfill user generated entropy if less than 32 bytes provided', async () => {
    const l = new LegacyWallet();
    const values = [...Array(16)].map(() => 1);
    await l.generateFromEntropy(Buffer.from(values));
    assert.strictEqual(l.getSecret().startsWith('KwFfNUhSDaASSAwtG7ssQM'), true);
    assert.strictEqual(l.getSecret().endsWith('GHWnnLfhfiQDigjioWXHH'), false);
    const keyPair = ECPair.fromWIF(l.getSecret());
    assert.strictEqual(keyPair.privateKey.toString('hex').startsWith('01010101'), true);
    assert.strictEqual(keyPair.privateKey.toString('hex').endsWith('01010101'), false);
    assert.strictEqual(keyPair.privateKey.toString('hex').endsWith('00000000'), false);
    assert.strictEqual(keyPair.privateKey.toString('hex').endsWith('ffffffff'), false);
  });

  it('can sign and verify messages', async () => {
    const l = new LegacyWallet();
    l.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'H9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });

  it('can sign and verify messages with uncompressed key', async () => {
    const l = new LegacyWallet();
    l.setSecret('5JqSfbkoVDrzM5i7PH7939G5fwWVDWmnFTSMbVctAmet3tYMq2S');

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'G19XLC0OYWN5ftv3N01s1PSt9Zpy0ZRKL2THZA46qGb0Jax29+SFmsdlsup0QKFeGJYN+m2HQTG1Na+YxcjU9ew=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });
});
