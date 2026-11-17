import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, BIP32Interface } from 'bip32';

import ecc from '../../../blue_modules/noble_ecc';
import { hexToUint8Array } from '../../../blue_modules/uint8array-extras';
import { IPayjoinClientWallet, IPayjoinRequester, PayjoinClient } from '../../../blue_modules/payjoin-client';
import VECTORS from './fixtures';

const bip32 = BIP32Factory(ecc);
const network = bitcoin.networks.regtest;
const PAYMENT_SCRIPT = hexToUint8Array('a91457f78d3d696767f4d6d1c8ac5986babad244ed6f87');

class TestWallet implements IPayjoinClientWallet {
  tx: bitcoin.Transaction | undefined;
  private psbtString: string;
  private rootNode: BIP32Interface;

  constructor(psbtString: string, rootNode: BIP32Interface) {
    this.psbtString = psbtString;
    this.rootNode = rootNode;
  }

  async getPsbt() {
    return bitcoin.Psbt.fromBase64(this.psbtString, { network });
  }

  async signPsbt(psbt: bitcoin.Psbt) {
    psbt.data.inputs.forEach((input, i) => {
      if (input.finalScriptSig === undefined && input.finalScriptWitness === undefined) {
        psbt.signInputHD(i, this.rootNode).finalizeInput(i);
      }
    });
    return psbt;
  }

  async broadcastTx(txHex: string) {
    this.tx = bitcoin.Transaction.fromHex(txHex);
    return '';
  }

  async scheduleBroadcastTx() {}
}

class DummyRequester implements IPayjoinRequester {
  private psbt: string;

  constructor(psbt: string) {
    this.psbt = psbt;
  }

  async requestPayjoin(): Promise<bitcoin.Psbt> {
    // vectors deliberately return nothing to test "Psbt was not returned"
    if (!this.psbt) return undefined as unknown as bitcoin.Psbt;
    return bitcoin.Psbt.fromBase64(this.psbt, { network });
  }
}

async function runVector(vector: any) {
  const rootNode = bip32.fromBase58(VECTORS.privateRoot, network);
  const wallet = new TestWallet(vector.wallet, rootNode);
  const client = new PayjoinClient({
    wallet,
    payjoinRequester: new DummyRequester(vector.payjoin),
    paymentScript: PAYMENT_SCRIPT,
    payjoinParameters: vector.payjoinParameters,
  });
  await client.run();
  assert.ok(wallet.tx);
  assert.strictEqual(wallet.tx.toHex(), vector.finaltx);
}

describe('PayjoinClient', () => {
  it('throws on invalid opts', () => {
    const wallet = new TestWallet('', null as any);
    assert.throws(() => new PayjoinClient(null as any));
    assert.throws(() => new PayjoinClient({ payjoinUrl: 'hello', wallet, paymentScript: null as any }), /paymentScript/);
    assert.throws(() => new PayjoinClient({ payjoinUrl: null as any, wallet, paymentScript: PAYMENT_SCRIPT }), /payjoinUrl/);
    assert.throws(() => new PayjoinClient({ payjoinUrl: 'hello', wallet: null as any, paymentScript: PAYMENT_SCRIPT }), /wallet/);
  });

  VECTORS.valid.forEach(f => {
    it('requests p2sh-p2wpkh payjoin', async () => runVector(f.p2shp2wpkh));
    it('requests p2wpkh payjoin', async () => runVector(f.p2wpkh));
  });

  VECTORS.invalid.forEach(f => {
    it(f.description, async () => {
      await assert.rejects(runVector(f.vector), new RegExp(f.exception));
    });
  });
});
