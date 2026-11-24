import assert from 'assert';
import { bech32m } from 'bech32';
import fixtures from './fixtures/neurai-key4-addresses.json';
import { RpcBackend } from '../../blue_modules/neurai/RpcBackend';

import { getAddressPair } from '@neuraiproject/neurai-key';
import {
  checkCode,
  computeIndexEntry,
  deriveKeysFromMnemonic,
  getContext,
  scanTransaction,
  type IndexEntry,
} from '@neuraiproject/neurai-silent-payments';
import { computeTxid, encodeDestinationScript, parseTransaction } from '@neuraiproject/neurai-create-transaction';
import * as bitcoin from 'bitcoinjs-lib';
import { CHAIN_PARAMS, chainFor, createDefaultBackend, isKindAvailable, isTestnetChain, kindOfChain } from '../../blue_modules/neurai';
import { signerNetworkFor } from '../../blue_modules/neurai/keyNetwork';
import { estimateNeuraiFeeSats, estimateNeuraiTxSizeKb } from '../../blue_modules/neurai/feeEstimate';
import { AbstractNeuraiWallet, spendableCoins } from '../../class/wallets/abstract-neurai-wallet';
import { setSingleAddressForAll } from '../../blue_modules/neurai/addressPolicy';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from '../../class/wallets/neurai-pq-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';

const KNOWN_MNEMONIC = 'result pact model attract result puzzle final boss private educate luggage era';

/** `wallet` holding one coin of each of `sats` on its first address, txids `c0…`, `c1…`… */
const funded = async <W extends NeuraiHDWallet | NeuraiPQWallet | NeuraiECDSAWallet>(
  wallet: W,
  sats: number[] = [500_000_000],
): Promise<W> => {
  const [own] = await wallet.listOwnAddresses();
  const script = Buffer.from(encodeDestinationScript(own)).toString('hex');
  const utxos = sats.map((satoshis, i) => ({
    address: own,
    assetName: 'XNA',
    txid: `c${i}`.repeat(32),
    outputIndex: 0,
    script,
    satoshis,
    height: 100,
  }));
  const rpc = jest.fn(async (method: string, params: unknown[] = []) => {
    if (method === 'getaddressutxos') return utxos;
    if (method === 'getaddressmempool') return [];
    if (method === 'gettxout') {
      const coin = utxos.find(u => u.txid === params[0]);
      return { value: (coin?.satoshis ?? 0) / 1e8, scriptPubKey: { hex: script } };
    }
    throw new Error(`unexpected rpc ${method}`);
  });
  wallet.setBackend({ chain: wallet.network, rpc } as never);
  return wallet;
};

const scriptOf = (address: string) => Buffer.from(encodeDestinationScript(address)).toString('hex');

/** Whether `script` pays one of the addresses `wallet` derived. */
const paysWallet = async (wallet: Pick<AbstractNeuraiWallet, 'listOwnAddresses'>, script: string) =>
  (await wallet.listOwnAddresses()).some(address => scriptOf(address) === script);

/** Every input of `signedHex` carries a signature, in its script or its witness. */
const assertSigned = (signedHex: string) => {
  for (const input of parseTransaction(signedHex).inputs) {
    assert.ok(input.scriptSigHex || input.witness?.length, `input ${input.txid}:${input.vout} is signed`);
  }
};

describe('Neurai wallets', () => {
  describe('backend defaults', () => {
    it('uses wallet-service WSS endpoints by default', () => {
      assert.strictEqual(CHAIN_PARAMS.xna.defaultWssUrl, 'wss://wallet-main-wss.neurai.org:443/push');
      assert.strictEqual(CHAIN_PARAMS['xna-test'].defaultWssUrl, 'wss://wallet-testnet-wss.neurai.org:443/push');
      assert.strictEqual(CHAIN_PARAMS['xna-test'].defaultWssAuthToken, 'testnet-wss-token-do-not-use-in-production');
      assert.strictEqual(createDefaultBackend('mainnet', 'legacy').kind, 'wss');
      assert.strictEqual(createDefaultBackend('testnet', 'legacy').kind, 'wss');
    });
  });

  describe('NeuraiHDWallet', () => {
    it('defaults to xna-test on testnet', () => {
      const w = new NeuraiHDWallet();
      assert.strictEqual(w.network, 'xna-test');
      assert.strictEqual(w.walletKind, 'legacy');
      assert.strictEqual(w.type, 'NeuraiHD');
      assert.strictEqual(w.typeReadable, 'Neurai HD');
    });

    it('forNetwork builds a wallet pre-configured for mainnet', () => {
      const w = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      assert.strictEqual(w.network, 'xna');
      assert.strictEqual(w.getNeuraiNetwork(), 'mainnet');
      assert.strictEqual(w.getSecret(), KNOWN_MNEMONIC);
    });

    it('rejects PQ networks', () => {
      const w = new NeuraiHDWallet();
      assert.throws(() => w.setNetwork('xna-pq-test'), /Wallet kind mismatch/);
      assert.throws(() => w.setNetwork('xna-pq'), /Wallet kind mismatch/);
    });

    it('derives a testnet receive address starting with t', async () => {
      const w = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      assert.strictEqual(typeof address, 'string');
      assert.ok(address.startsWith('t'), `expected testnet prefix, got ${address}`);
      assert.ok(w.weOwnAddress(address), 'wallet should recognise its own derived address');
    }, 30_000);

    it('derives a mainnet receive address starting with N', async () => {
      const w = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      assert.ok(address.startsWith('N'), `expected mainnet prefix, got ${address}`);
    }, 30_000);

    it('mainnet and testnet derive different addresses from the same mnemonic', async () => {
      const main = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      const test = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const mainAddr = await main.getReceiveAddressAsync();
      const testAddr = await test.getReceiveAddressAsync();
      assert.notStrictEqual(mainAddr, testAddr);
    }, 30_000);
  });

  describe('NeuraiPQWallet', () => {
    it('defaults to xna-pq-test on testnet', () => {
      const w = new NeuraiPQWallet();
      assert.strictEqual(w.network, 'xna-pq-test');
      assert.strictEqual(w.walletKind, 'pq');
      assert.strictEqual(w.allowSweepFromWif(), false);
    });

    it('rejects legacy networks', () => {
      const w = new NeuraiPQWallet();
      assert.throws(() => w.setNetwork('xna'), /Wallet kind mismatch/);
      assert.throws(() => w.setNetwork('xna-test'), /Wallet kind mismatch/);
    });

    it('derives a testnet strict PQ bech32m address with tpq1 prefix', async () => {
      const w = NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      const hrp = CHAIN_PARAMS['xna-pq-test'].hrp ?? '';
      assert.ok(address.startsWith(`${hrp}1`), `expected ${hrp}1 prefix, got ${address}`);
    }, 30_000);

    it('derives a mainnet AuthScript PQ bech32m address with nc1p prefix', async () => {
      const w = NeuraiPQWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      assert.ok(address.startsWith('nc1p'), `expected nc1p prefix, got ${address}`);
    }, 30_000);
  });

  describe('NeuraiECDSAWallet', () => {
    const ecdsaPair = (network: 'xna' | 'xna-test', index: number) =>
      getAddressPair(network, KNOWN_MNEMONIC, 0, index) as unknown as {
        external: { address: string; path: string; commitment: string; publicKey: string };
        internal: { address: string; path: string };
      };

    it('defaults to xna-ecdsa-test on testnet', () => {
      const w = new NeuraiECDSAWallet();
      assert.strictEqual(w.network, 'xna-ecdsa-test');
      assert.strictEqual(w.walletKind, 'ecdsa');
      assert.strictEqual(w.type, 'NeuraiECDSA');
      assert.strictEqual(w.allowSweepFromWif(), true);
      assert.strictEqual(w.getEngineNetwork(), 'xna-ecdsa-test');
    });

    it('maps the ECDSA chains', () => {
      assert.strictEqual(chainFor('testnet', 'ecdsa'), 'xna-ecdsa-test');
      assert.strictEqual(chainFor('mainnet', 'ecdsa'), 'xna-ecdsa');
      assert.strictEqual(kindOfChain('xna-ecdsa-test'), 'ecdsa');
      assert.strictEqual(isTestnetChain('xna-ecdsa-test'), true);
      assert.strictEqual(isTestnetChain('xna-ecdsa'), false);
      assert.strictEqual(signerNetworkFor('xna-ecdsa-test'), 'xna-test');
      // Witness families are testnet-only until they activate on mainnet.
      assert.strictEqual(isKindAvailable('mainnet', 'ecdsa'), false);
      assert.strictEqual(isKindAvailable('mainnet', 'pq'), false);
      assert.strictEqual(isKindAvailable('mainnet', 'legacy'), true);
      assert.strictEqual(isKindAvailable('testnet', 'ecdsa'), true);
    });

    it('rejects Legacy and PQ networks', () => {
      const w = new NeuraiECDSAWallet();
      assert.throws(() => w.setNetwork('xna-test'), /Wallet kind mismatch/);
      assert.throws(() => w.setNetwork('xna-pq-test'), /Wallet kind mismatch/);
      assert.throws(() => new NeuraiHDWallet().setNetwork('xna-ecdsa-test'), /Wallet kind mismatch/);
    });

    it('derives the NIP-047 silent payment code of its words and passphrase', () => {
      const w = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const code = w.getSilentPaymentCode();
      assert.strictEqual(code, deriveKeysFromMnemonic(KNOWN_MNEMONIC, '', 'test').code);
      assert.ok(checkCode(code, 'test').valid);
      assert.strictEqual(w.getSilentPaymentCode(), code);
      // The cached code is not persisted.
      assert.ok(!JSON.stringify(w).includes(code));

      w.setPassphrase('25th word');
      const withPassphrase = w.getSilentPaymentCode();
      assert.notStrictEqual(withPassphrase, code);
      assert.strictEqual(withPassphrase, deriveKeysFromMnemonic(KNOWN_MNEMONIC, '25th word', 'test').code);

      w.setNetwork('xna-ecdsa');
      assert.ok(w.getSilentPaymentCode().startsWith('nsp1'));
    });

    describe('silent payments', () => {
      const RECEIVER_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const receiver = deriveKeysFromMnemonic(RECEIVER_MNEMONIC, '', 'test');
      const coins = [
        { txid: 'aa'.repeat(32), outputIndex: 0, satoshis: 100000000, key: ecdsaPair('xna-test', 0).external },
        { txid: 'bb'.repeat(32), outputIndex: 1, satoshis: 50000000, key: ecdsaPair('xna-test', 1).external },
      ].map(c => ({
        txid: c.txid,
        outputIndex: c.outputIndex,
        satoshis: c.satoshis,
        address: c.key.address,
        assetName: 'XNA',
        script: `5320${c.key.commitment}`,
        height: 100,
      }));

      const senderWallet = () => {
        const w = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
        const rpc = jest.fn(async (method: string) => {
          if (method === 'getaddressutxos') return coins;
          if (method === 'getaddressmempool') return [];
          throw new Error(`unexpected rpc ${method}`);
        });
        jest.spyOn(w, 'getBackend').mockReturnValue({ chain: 'xna-ecdsa-test', rpc } as never);
        return w;
      };

      // What a receiver scans: the signed transaction plus the scripts its inputs spend.
      const scanTxOf = (signedHex: string, prevouts: { txid: string; outputIndex: number; script: string }[] = coins) => {
        const tx = parseTransaction(signedHex);
        assert.strictEqual(tx.version, 2);
        return {
          txid: computeTxid(signedHex),
          version: tx.version,
          inputs: tx.inputs.map(i => ({
            txid: i.txid,
            vout: i.vout,
            witness: i.witness ?? [],
            prevoutScript: prevouts.find(c => c.txid === i.txid && c.outputIndex === i.vout)?.script,
          })),
          outputs: tx.outputs.map(o => ({ script: o.scriptPubKeyHex, valueSat: o.valueSats })),
        };
      };
      const receivedBy = (signedHex: string, prevouts: { txid: string; outputIndex: number; script: string }[] = coins) => ({
        tx: parseTransaction(signedHex),
        payments: scanTransaction(scanTxOf(signedHex, prevouts), receiver, { network: 'test' }),
      });

      it('pays a one-time address that the receiver finds by scanning', async () => {
        const result = await senderWallet().buildSilentPaymentTransaction(receiver.code, '1.2');
        const { tx, payments } = receivedBy(result.signedHex);
        assert.strictEqual(tx.inputs.length, 2);
        assert.strictEqual(tx.outputs.length, 2);
        assert.strictEqual(payments.length, 1);
        assert.strictEqual(payments[0].valueSat, 120000000n);
        assert.strictEqual(payments[0].address, (result.debug as { silentPayment: { address: string } }).silentPayment.address);
        assert.strictEqual(result.sentAmountSats, 120000000n);
        assert.strictEqual(result.netDebitSats, 120000000n + result.feeSats);
        const change = tx.outputs.find(o => o.scriptPubKeyHex !== Buffer.from(payments[0].script).toString('hex'));
        assert.strictEqual(change?.valueSats, 150000000n - 120000000n - result.feeSats);
      });

      it('spends every coin without change when sending the whole balance', async () => {
        const result = await senderWallet().buildSilentPaymentTransaction(receiver.code, null);
        const { tx, payments } = receivedBy(result.signedHex);
        assert.strictEqual(tx.outputs.length, 1);
        assert.strictEqual(payments.length, 1);
        assert.strictEqual(payments[0].valueSat, 150000000n - result.feeSats);
      });

      it('pays a code from the ticked coins only', async () => {
        const w = senderWallet();
        const ticked = (await w.listCoins()).filter(c => c.txid === 'bb'.repeat(32));
        const result = await w.buildCoinControlTransaction(ticked, receiver.code, '0.2');
        const { tx, payments } = receivedBy(result.signedHex);
        assert.deepStrictEqual(
          tx.inputs.map(i => `${i.txid}:${i.vout}`),
          [`${'bb'.repeat(32)}:1`],
        );
        assert.strictEqual(payments.length, 1);
        assert.strictEqual(payments[0].valueSat, 20000000n);
        assert.strictEqual(tx.outputs[1].valueSats, 50000000n - 20000000n - result.feeSats);
        assert.ok(await paysWallet(w, tx.outputs[1].scriptPubKeyHex), 'the change goes to the wallet');
      });

      it('refuses codes of another network and networks without witness v3', async () => {
        const mainnetCode = deriveKeysFromMnemonic(RECEIVER_MNEMONIC, '', 'main').code;
        await assert.rejects(senderWallet().buildSilentPaymentTransaction(mainnetCode, '1'), /Invalid silent payment code \(network\)/);
        await assert.rejects(
          NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC).buildSilentPaymentTransaction(mainnetCode, '1'),
          /not active on this network/,
        );
      });

      describe('from Legacy and PQ wallets', () => {
        // First ECDSA change address of the same words: the coin between both transactions.
        const bridgeAddress = ecdsaPair('xna-test', 0).internal.address;

        // The second transaction spends the first one's coin on the ECDSA address and pays the code.
        const bridged = (result: { signedHex: string; chainedHex?: string }) => {
          assert.ok(result.chainedHex, 'a second transaction');
          const bridgeScript = Buffer.from(encodeDestinationScript(bridgeAddress)).toString('hex');
          const first = parseTransaction(result.signedHex);
          const vout = first.outputs.findIndex(o => o.scriptPubKeyHex === bridgeScript);
          assert.ok(vout >= 0, 'the first transaction pays the ECDSA address');
          const bridgeCoin = { txid: computeTxid(result.signedHex), outputIndex: vout, script: bridgeScript };
          const second = receivedBy(result.chainedHex!, [bridgeCoin]);
          assert.deepStrictEqual(
            second.tx.inputs.map(i => `${i.txid}:${i.vout}`),
            [`${bridgeCoin.txid}:${vout}`],
          );
          assert.strictEqual(second.tx.outputs.length, 1);
          return { first, bridgeSats: first.outputs[vout].valueSats, payments: second.payments };
        };

        it('pays from a Legacy wallet through the ECDSA address of its words', async () => {
          const wallet = await funded(NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC));
          const result = await wallet.buildSilentPaymentTransaction(receiver.code, '1.2');
          const { first, bridgeSats, payments } = bridged(result);
          assert.strictEqual(payments.length, 1);
          assert.strictEqual(payments[0].valueSat, 120000000n);
          assert.strictEqual(first.outputs.length, 2, 'the change stays in the Legacy wallet');
          assert.strictEqual(result.sentAmountSats, 120000000n);
          assert.strictEqual(result.netDebitSats, 120000000n + result.feeSats);
          assert.ok(bridgeSats > 120000000n && bridgeSats < 120000000n + result.feeSats, 'the bridge carries the second fee');
          assert.strictEqual((result.debug as { bridge: { address: string } }).bridge.address, bridgeAddress);
        }, 60_000);

        it('sends the whole balance of a PQ wallet', async () => {
          const wallet = await funded(NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC));
          const result = await wallet.buildSilentPaymentTransaction(receiver.code, null);
          const { first, payments } = bridged(result);
          assert.strictEqual(first.outputs.length, 1);
          assert.strictEqual(payments.length, 1);
          assert.strictEqual(payments[0].valueSat, 500000000n - result.feeSats);
          assert.strictEqual(result.netDebitSats, 500000000n);
        }, 60_000);

        it('pays from the ticked coins of a Legacy wallet', async () => {
          const wallet = await funded(NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC), [300_000_000, 100_000_000]);
          const small = (await wallet.listCoins()).filter(c => c.satoshis === 100_000_000n);
          const result = await wallet.buildCoinControlTransaction(small, receiver.code, '0.4');
          const { first, payments } = bridged(result);
          assert.deepStrictEqual(
            first.inputs.map(i => `${i.txid}:${i.vout}`),
            [`${small[0].txid}:0`],
          );
          assert.strictEqual(payments.length, 1);
          assert.strictEqual(payments[0].valueSat, 40000000n);
          assert.strictEqual(result.netDebitSats, 40000000n + result.feeSats);
        }, 60_000);
      });

      describe('receiving', () => {
        const chain = { network: 'test' as const };
        const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
        const hash = (height: number) => height.toString(16).padStart(64, '0');
        const indexBlock = (height: number, entries: IndexEntry[] = []) => ({
          height,
          hash: hash(height),
          prev: hash(height - 1),
          entries: entries.map(e => ({
            txid: e.txid,
            tweak: hex(e.tweak),
            outputs: e.outputs.map(o => ({ vout: o.vout, commitment: hex(o.commitment), value_sat: o.valueSat.toString() })),
          })),
          spent: [],
        });
        const indexRange = (blocks: ReturnType<typeof indexBlock>[], tip: number) => ({
          format: 1,
          context: hex(getContext(chain)),
          snapshot: { height: tip, hash: hash(tip) },
          synced_height: tip,
          blocks,
          next_height: tip + 1,
          status: 'tip',
        });

        /** A payment of 1.2 XNA to the receiver, mined in block 11 of an index that ends at block 12. */
        const paidIndex = async () => {
          const sent = await senderWallet().buildSilentPaymentTransaction(receiver.code, '1.2');
          const entry = computeIndexEntry(scanTxOf(sent.signedHex), chain);
          assert.ok(entry);
          const [paid] = receivedBy(sent.signedHex).payments;
          const range = (from: number) =>
            indexRange(
              [10, 11, 12].filter(h => h >= from).map(h => indexBlock(h, h === 11 ? [entry] : [])),
              12,
            );
          return { paid, range };
        };

        const receiverWallet = (rpc: (method: string, params: unknown[]) => Promise<unknown>, backend: object = {}) => {
          const w = NeuraiECDSAWallet.forNetwork('testnet', RECEIVER_MNEMONIC);
          const mock = jest.fn(rpc);
          w.setBackend({ chain: w.network, rpc: mock, ...backend } as never);
          return { w, rpc: mock };
        };
        const indexInfo = { enabled: true, start_height: 10, synced_height: 12, synced_hash: hash(12) };

        /** Receiver that found the payment, with a backend that serves its coin. */
        const paidReceiver = async () => {
          const { paid, range } = await paidIndex();
          const coin = { address: paid.address, assetName: 'XNA', txid: paid.txid, outputIndex: paid.vout, script: hex(paid.script) };
          const coinsOf = (addresses: string[]) =>
            addresses.includes(coin.address) ? [{ ...coin, satoshis: 120000000n, height: 11 }] : [];
          const { w, rpc } = receiverWallet(
            async (method, params) => {
              if (method === 'getsilentpaymentindexinfo') return indexInfo;
              if (method === 'getsilentpaymenttweaksrange') return range(params[0] as number);
              if (method === 'getaddressutxos') return coinsOf((params[0] as { addresses: string[] }).addresses);
              if (method === 'getaddressmempool') return [];
              throw new Error(`unexpected rpc ${method}`);
            },
            // Like the wallet service, the backend sends no scripts.
            { getUtxos: async (addresses: string[]) => coinsOf(addresses).map(u => ({ ...u, script: '' })), getMempool: async () => [] },
          );
          assert.strictEqual(await w.syncSilentPayments(), true);
          return { w, rpc, paid, coin };
        };

        it('finds payments to its code in the index and keeps them', async () => {
          const { w, rpc, paid } = await paidReceiver();
          assert.deepStrictEqual(
            w._silentPayments.map(p => [p.txid, p.vout, p.address, p.height]),
            [[paid.txid, paid.vout, paid.address, 11]],
          );
          assert.deepStrictEqual(w._silentPaymentScan, { height: 12, hash: hash(12) });
          // Balance and history include the payment; the engine, which builds the normal sends, does not.
          const walletAddresses = await (w as unknown as { _walletAddresses(): Promise<string[]> })._walletAddresses();
          assert.ok(walletAddresses.includes(paid.address));
          assert.ok(!(await w.getAddressesAsync()).includes(paid.address));

          // The next scan continues after the last block, anchored on its hash.
          assert.strictEqual(await w.syncSilentPayments(), false);
          expect(rpc.mock.calls.at(-1)).toEqual(['getsilentpaymenttweaksrange', [13, 1000, hash(12), 'hex']]);

          const restored = NeuraiECDSAWallet.fromJson(JSON.stringify(w)) as unknown as NeuraiECDSAWallet;
          assert.deepStrictEqual(restored._silentPayments, w._silentPayments);
          assert.deepStrictEqual(restored._silentPaymentScan, w._silentPaymentScan);

          w.setPassphrase('other identity');
          assert.deepStrictEqual(w._silentPayments, []);
          assert.strictEqual(w._silentPaymentScan, null);
        });

        it('knows how much of its balance is on its silent payment addresses, kept after a restart', async () => {
          const { w, paid } = await paidReceiver();
          const backend = w.getBackend() as unknown as { getBalance: (addresses: string[]) => Promise<bigint> };
          // 1.2 XNA on the payment's address, 0.3 on the wallet's other addresses.
          backend.getBalance = async addresses =>
            (addresses.includes(paid.address) ? 120000000n : 0n) + (addresses.some(a => a !== paid.address) ? 30000000n : 0n);
          await w.fetchBalance();
          assert.strictEqual(w.getBalance(), 150000000n);
          assert.strictEqual(w.getSilentBalance(), 120000000n);

          const restored = NeuraiECDSAWallet.fromJson(JSON.stringify(w)) as unknown as NeuraiECDSAWallet;
          assert.strictEqual(restored.getSilentBalance(), 120000000n);

          w.setPassphrase('other identity');
          assert.strictEqual(w.getSilentBalance(), 0n);
        });

        it('spends its payments apart from the other coins, with the change back to its own code', async () => {
          const { w, paid, coin } = await paidReceiver();
          const elsewhere = ecdsaPair('xna-test', 0).external.address;
          await assert.rejects(w.buildSendTransaction([{ address: elsewhere, amount: '1' }]), 'a normal send does not see them');

          const silentCoins = await w.listSilentPaymentCoins();
          assert.deepStrictEqual(
            silentCoins.map(c => [c.txid, c.outputIndex, c.satoshis, c.script]),
            [[paid.txid, paid.vout, 120000000n, coin.script]],
          );

          const built = await w.buildSilentPaymentCoinsTransaction(silentCoins, elsewhere, '0.5');
          const { tx, payments } = receivedBy(built.signedHex, [coin]);
          assert.deepStrictEqual(
            tx.inputs.map(i => `${i.txid}:${i.vout}`),
            [`${paid.txid}:${paid.vout}`],
          );
          assert.strictEqual(tx.outputs[0].valueSats, 50000000n);
          assert.strictEqual(payments.length, 1, 'the change is a silent payment to its own code');
          assert.strictEqual(payments[0].valueSat, 120000000n - 50000000n - built.feeSats);
          assert.strictEqual(built.netDebitSats, 50000000n + built.feeSats);

          const max = await w.buildSilentPaymentCoinsTransaction(silentCoins, elsewhere, null);
          const all = receivedBy(max.signedHex, [coin]);
          assert.strictEqual(all.tx.outputs.length, 1);
          assert.strictEqual(all.tx.outputs[0].valueSats, 120000000n - max.feeSats);
          assert.strictEqual(all.payments.length, 0);
        });

        it('forgets payments above a reorganisation and scans again from the fork', async () => {
          const { paid, range } = await paidIndex();
          let reorged = false;
          const { w } = receiverWallet(async (method, params) => {
            if (method === 'getsilentpaymentindexinfo') return indexInfo;
            if (method !== 'getsilentpaymenttweaksrange') throw new Error(`unexpected rpc ${method}`);
            if (!reorged) return range(params[0] as number);
            // Block 11 left the chain: the anchored request reports the fork, the next one gets the new blocks.
            if (params[2] === hash(12)) return { reorg: true, fork_height: 10 };
            return indexRange([indexBlock(11), indexBlock(12)], 12);
          });
          assert.strictEqual(await w.syncSilentPayments(), true);
          assert.strictEqual(w._silentPayments[0].txid, paid.txid);
          reorged = true;
          assert.strictEqual(await w.syncSilentPayments(), true);
          assert.deepStrictEqual(w._silentPayments, []);
        });

        it('starts at the tip on a wallet created here', async () => {
          const w = new NeuraiECDSAWallet();
          w.generate();
          const rpc = jest.fn(async (method: string) => {
            if (method === 'getsilentpaymentindexinfo') return indexInfo;
            throw new Error(`unexpected rpc ${method}`);
          });
          w.setBackend({ chain: w.network, rpc } as never);
          assert.strictEqual(await w.syncSilentPayments(), false);
          assert.deepStrictEqual(w._silentPaymentScan, { height: 12, hash: hash(12) });
          expect(rpc.mock.calls.map(c => c[0])).toEqual(['getsilentpaymentindexinfo']);
        });
      });
    });

    it("derives the node's witness v3 addresses under m/84'", async () => {
      const w = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      const expected = ecdsaPair('xna-test', 0);
      assert.strictEqual(address, expected.external.address);
      assert.strictEqual(expected.external.path, "m/84'/1'/0'/0/0");
      assert.ok(address.startsWith('tnq1r'), `expected tnq1r prefix, got ${address}`);
      assert.ok(w.weOwnAddress(expected.internal.address), 'the change branch belongs to the wallet');
      const legacy = await NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC).getReceiveAddressAsync();
      assert.notStrictEqual(address, legacy);
    }, 30_000);

    it('derives mainnet nq1r addresses', async () => {
      const w = NeuraiECDSAWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      const address = await w.getReceiveAddressAsync();
      assert.strictEqual(address, ecdsaPair('xna', 0).external.address);
      assert.ok(address.startsWith('nq1r'), `expected nq1r prefix, got ${address}`);
    }, 30_000);

    it('round-trips via fromJson as an ECDSA wallet', () => {
      const w = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const restored = NeuraiECDSAWallet.fromJson(JSON.stringify(w)) as unknown as NeuraiECDSAWallet;
      assert.strictEqual(restored.type, 'NeuraiECDSA');
      assert.strictEqual(restored.network, 'xna-ecdsa-test');
      assert.strictEqual(restored.getSecret(), KNOWN_MNEMONIC);
    });

    it('signs a spend of its witness v3 coin with the [0x02, sig, pubkey, OP_TRUE] witness', async () => {
      const w = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const own = ecdsaPair('xna-test', 0).external;
      const txid = 'ab'.repeat(32);
      const rpc = jest.fn(async (method: string) => {
        if (method === 'getaddressutxos') {
          return [
            {
              address: own.address,
              assetName: 'XNA',
              txid,
              outputIndex: 1,
              script: `5320${own.commitment}`,
              satoshis: 500_000_000,
              height: 100,
            },
          ];
        }
        if (method === 'getaddressmempool') return [];
        if (method === 'gettxout') return { value: 5, scriptPubKey: { hex: `5320${own.commitment}` } };
        throw new Error(`unexpected rpc ${method}`);
      });
      jest.spyOn(w, 'getBackend').mockReturnValue({ chain: 'xna-ecdsa-test', rpc } as never);
      const built = await w.buildSendTransaction([{ address: ecdsaPair('xna-test', 1).external.address, amount: '1' }]);
      const tx = bitcoin.Transaction.fromHex(built.signedHex);
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(Buffer.from(tx.ins[0].hash).reverse().toString('hex'), txid);
      const witness = tx.ins[0].witness.map(item => Buffer.from(item).toString('hex'));
      assert.strictEqual(witness.length, 4);
      assert.strictEqual(witness[0], '02');
      assert.strictEqual(witness[2], own.publicKey);
      assert.strictEqual(witness[3], '51');
    }, 30_000);
  });

  describe('coin control', () => {
    const elsewhere = (
      getAddressPair('xna-test', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', 0, 0) as {
        external: { address: string };
      }
    ).external.address;

    it('lists the XNA coins largest first, without the ones the mempool spends', () => {
      const coin = (txid: string, satoshis: bigint, assetName = 'XNA') => ({
        txid,
        outputIndex: 0,
        satoshis,
        address: elsewhere,
        assetName,
        script: '',
      });
      const coins = spendableCoins(
        [coin('a1', 1n), coin('a2', 5n), coin('a3', 3n), coin('a4', 9n, 'TOKEN'), coin('a5', 0n)],
        [{ prevtxid: 'a3', prevout: 0 }],
      );
      assert.deepStrictEqual(
        coins.map(c => c.txid),
        ['a2', 'a1'],
      );
      // The wallet service sends no scripts: they come from the addresses.
      assert.strictEqual(coins[0].script, scriptOf(elsewhere));
      assert.strictEqual(coins[0].height, 0);
    });

    it('spends exactly the ticked coins of a Legacy wallet, with the change to the wallet', async () => {
      const wallet = await funded(NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC), [300_000_000, 200_000_000, 100_000_000]);
      const coins = await wallet.listCoins();
      assert.deepStrictEqual(
        coins.map(c => c.satoshis),
        [300000000n, 200000000n, 100000000n],
      );
      const ticked = coins.slice(1);
      const result = await wallet.buildCoinControlTransaction(ticked, elsewhere, '2.5');
      assertSigned(result.signedHex);
      const tx = parseTransaction(result.signedHex);
      assert.deepStrictEqual(
        tx.inputs.map(i => i.txid),
        ticked.map(c => c.txid),
      );
      assert.strictEqual(tx.outputs[0].scriptPubKeyHex, scriptOf(elsewhere));
      assert.strictEqual(tx.outputs[0].valueSats, 250000000n);
      assert.strictEqual(tx.outputs[1].valueSats, 300000000n - 250000000n - result.feeSats);
      assert.ok(await paysWallet(wallet, tx.outputs[1].scriptPubKeyHex), 'the change goes to the wallet');
      assert.strictEqual(result.netDebitSats, 250000000n + result.feeSats);

      await assert.rejects(
        wallet.buildCoinControlTransaction(coins.slice(2), elsewhere, '1'),
        /do not cover the amount and the network fee/,
      );
      await assert.rejects(wallet.buildCoinControlTransaction([], elsewhere, '1'), /Select the coins/);
    }, 60_000);

    it('sends the whole of the ticked coins of a PQ wallet without change', async () => {
      const wallet = await funded(NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC), [300_000_000, 100_000_000]);
      const [, small] = await wallet.listCoins();
      const result = await wallet.buildCoinControlTransaction([small], elsewhere, null);
      assertSigned(result.signedHex);
      const tx = parseTransaction(result.signedHex);
      assert.deepStrictEqual(
        tx.inputs.map(i => i.txid),
        [small.txid],
      );
      assert.strictEqual(tx.outputs.length, 1);
      assert.strictEqual(tx.outputs[0].valueSats, 100000000n - result.feeSats);
      assert.strictEqual(result.netDebitSats, 100000000n);
    }, 60_000);

    it('sends the PQ change to the forced address', async () => {
      const wallet = await funded(NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC), [300_000_000]);
      const receive = await wallet.getStaticReceiveAddress();
      const result = await wallet.buildCoinControlTransaction(await wallet.listCoins(), elsewhere, '1', { forcedChangeAddress: receive });
      assert.strictEqual(parseTransaction(result.signedHex).outputs[1].scriptPubKeyHex, scriptOf(receive));
    }, 60_000);
  });

  describe('serialization', () => {
    it('does not persist runtime engine/backend in JSON', async () => {
      const w = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      await w.getReceiveAddressAsync();
      const json = JSON.parse(JSON.stringify(w));
      assert.ok(!('_engine' in json), '_engine must not be serialized');
      assert.ok(!('_backend' in json), '_backend must not be serialized');
      // Caches are intentionally persisted (enumerable) so the UI can render
      // history and pending sends instantly on launch, before the next refresh.
      assert.ok('_historyItems' in json, '_historyItems should persist for offline render');
      assert.ok('_txCache' in json, '_txCache should persist for offline render');
      assert.ok('_pendingTxs' in json, '_pendingTxs should persist so pending sends survive a restart');
      assert.strictEqual(json.network, 'xna-test');
      assert.strictEqual(json.secret, KNOWN_MNEMONIC);
      assert.strictEqual(json.type, 'NeuraiHD');
    }, 30_000);

    it('round-trips via fromJson preserving network and secret', async () => {
      const original = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC);
      await original.getReceiveAddressAsync();
      const restored = NeuraiHDWallet.fromJson(JSON.stringify(original)) as unknown as NeuraiHDWallet;
      assert.ok(restored instanceof AbstractNeuraiWallet);
      assert.strictEqual(restored.network, 'xna');
      assert.strictEqual(restored.getSecret(), KNOWN_MNEMONIC);
      assert.strictEqual(restored.type, 'NeuraiHD');
    }, 30_000);

    it('keeps the receive address, so Receive shows it without deriving the addresses again', async () => {
      for (const wallet of [
        NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC),
        NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC),
      ]) {
        const address = await wallet.getReceiveAddressAsync();
        assert.strictEqual(address, (await wallet.listOwnAddresses())[0], 'the first external address');

        const restored =
          wallet.constructor === NeuraiHDWallet
            ? (NeuraiHDWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiHDWallet)
            : (NeuraiECDSAWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiECDSAWallet);
        const ensureEngine = jest.spyOn(restored as unknown as { ensureEngine(): Promise<unknown> }, 'ensureEngine');
        assert.strictEqual(restored.getAddress(), address);
        assert.strictEqual(await restored.getReceiveAddressAsync(), address);
        expect(ensureEngine).not.toHaveBeenCalled();

        // Other words, passphrase or network: other addresses.
        restored.setPassphrase('another');
        assert.strictEqual(restored.getAddress(), false);
        assert.notStrictEqual(await restored.getReceiveAddressAsync(), address);
        restored.setNetwork(restored.walletKind === 'ecdsa' ? 'xna-ecdsa' : 'xna');
        assert.strictEqual(restored.getAddress(), false);
        await restored.getReceiveAddressAsync();
        restored.setSecret(KNOWN_MNEMONIC);
        assert.strictEqual(restored.getAddress(), false);
      }
    }, 60_000);
  });

  describe('receive and change addresses', () => {
    /** Receive and change addresses of KNOWN_MNEMONIC's Legacy testnet wallet. */
    const pair = (index: number) =>
      getAddressPair('xna-legacy-test', KNOWN_MNEMONIC, 0, index) as unknown as {
        external: { address: string };
        internal: { address: string };
      };
    /** A wallet whose engine derived at least `positions` positions by itself, as it does past a used address. */
    const nativeWindow = async (Kind: typeof NeuraiHDWallet | typeof NeuraiECDSAWallet, positions: number) => {
      const w = Kind.forNetwork('testnet', KNOWN_MNEMONIC);
      (w as unknown as { _receiveIndex: number })._receiveIndex = positions - 1;
      await w.loadAddresses();
      return w;
    };
    /** The address objects (keys included) of a wallet's engine. */
    const engineObjects = (w: object) => (w as unknown as { _engine: { getAddressObjects(): unknown[] } })._engine.getAddressObjects();
    const external = (index: number) => pair(index).external.address;
    const internal = (index: number) => pair(index).internal.address;
    const elsewhere = getAddressPair(
      'xna-legacy-test',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      0,
      0,
    ).external.address as string;

    /** A Legacy wallet whose history has a payment to each of `paid`, with a 5 XNA coin on its first address. */
    const withHistory = (paid: string[]) => {
      const wallet = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      const history = { paid };
      let pushed: ((event: { address: string; delta?: { added_txids?: string[] } }) => void) | undefined;
      wallet.setBackend({
        chain: wallet.network,
        getAddressHistory: async (addresses: string[]) =>
          history.paid
            .filter(address => addresses.includes(address))
            .map((address, i) => ({
              address,
              assetName: 'XNA',
              blockindex: 0,
              height: 50 + i,
              index: 0,
              satoshis: 100000000n,
              txid: (i + 1).toString(16).padStart(64, '0'),
            })),
        getBalance: async () => 0n,
        getTipHeight: async () => 100,
        getBlockTimes: async () => ({}),
        rpc: async (method: string) => {
          const script = scriptOf(external(0));
          if (method === 'getaddressutxos') {
            return [
              { address: external(0), assetName: 'XNA', txid: 'c0'.repeat(32), outputIndex: 0, script, satoshis: 500_000_000, height: 10 },
            ];
          }
          if (method === 'gettxout') return { value: 5, scriptPubKey: { hex: script } };
          return [];
        },
        broadcast: async (rawHex: string) => computeTxid(rawHex),
        onAddressChanged: (listener: typeof pushed) => {
          pushed = listener;
          return () => {};
        },
      } as never);
      // The refetch a push or a longer window asks for runs in the background: the tests call it themselves.
      const refetch = jest
        .spyOn(wallet as unknown as { _refetchInBackground(): void }, '_refetchInBackground')
        .mockImplementation(() => {});
      return { wallet, history, refetch, push: (address: string) => pushed!({ address, delta: { added_txids: ['ee'.repeat(32)] } }) };
    };

    it('is the address after the last one that received, and never moves back', async () => {
      assert.strictEqual(external(0), (await NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC).listOwnAddresses())[0]);
      const { wallet, history } = withHistory([external(0), external(2)]);
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(0));
      await wallet.fetchTransactions();
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(3));
      assert.strictEqual((wallet as unknown as { _receiveIndex: number })._receiveIndex, 3);

      // Restarted, it shows it straight away.
      const restored = NeuraiHDWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiHDWallet;
      assert.strictEqual(restored.getAddress(), external(3));

      history.paid = [external(0)];
      await wallet.fetchTransactions();
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(3));
    }, 60_000);

    it('moves on as soon as a payment reaches the mempool', async () => {
      const { wallet, push } = withHistory([]);
      await wallet.fetchTransactions();
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(0));
      push(external(0));
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(1));
      // A change address or an older one does not move it.
      push((await wallet.listOwnAddresses())[1]);
      push(external(0));
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(1));
    }, 60_000);

    it('derives further when the last derived address received', async () => {
      const { wallet, refetch } = withHistory([external(19)]);
      await wallet.fetchTransactions();
      assert.strictEqual((wallet as unknown as { _receiveIndex: number })._receiveIndex, 20);
      expect(refetch).toHaveBeenCalled();
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(20));
      assert.strictEqual((await wallet.listOwnAddresses()).length, 80, '40 receive and 40 change addresses');
    }, 60_000);

    it('knows the transactions of each address, which tell the used ones, also after a restart', async () => {
      const { wallet, push } = withHistory([external(0), external(2)]);
      assert.strictEqual(wallet.addressActivityKnown(), false);
      await wallet.fetchTransactions();
      assert.strictEqual(wallet.addressActivityKnown(), true);
      assert.deepStrictEqual(wallet.getAddressTxids(external(0)), ['1'.padStart(64, '0')]);
      assert.strictEqual(wallet.isAddressUsed(external(2)), true);
      assert.strictEqual(wallet.isAddressUsed(external(1)), false);

      // A payment in the mempool marks its address at once, and survives a
      // fetch that does not have it confirmed yet.
      push(external(1));
      assert.deepStrictEqual(wallet.getAddressTxids(external(1)), ['ee'.repeat(32)]);
      await wallet.fetchTransactions();
      assert.strictEqual(wallet.isAddressUsed(external(1)), true);

      // Only the confirmed ones are stored: the history brings the rest.
      const restored = NeuraiHDWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiHDWallet;
      assert.strictEqual(restored.addressActivityKnown(), true);
      assert.strictEqual(restored.isAddressUsed(external(2)), true);
      assert.strictEqual(restored.isAddressUsed(external(1)), false);
    }, 60_000);

    it('lists receive and change addresses, and derives more on request, up to 100, kept after a restart', async () => {
      const { wallet, refetch } = withHistory([]);
      const receive = (w: NeuraiHDWallet) => w.getAddressEntries().filter(e => !e.change);
      await wallet.loadAddresses();
      assert.deepStrictEqual(wallet.getAddressEntries().slice(0, 2), [
        { address: external(0), index: 0, change: false },
        { address: internal(0), index: 0, change: true },
      ]);
      assert.strictEqual(receive(wallet).length, 20);
      expect(refetch).not.toHaveBeenCalled();

      await wallet.loadAddresses(30);
      assert.strictEqual(receive(wallet).length, 30);
      assert.deepStrictEqual(receive(wallet)[29], { address: external(29), index: 29, change: false });
      expect(refetch).toHaveBeenCalled();

      // The same addresses and keys the library derives when it reaches them itself.
      assert.deepStrictEqual(engineObjects(wallet), engineObjects(await nativeWindow(NeuraiHDWallet, 30)).slice(0, 60));

      // Restarted, it derives them again.
      const restored = NeuraiHDWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiHDWallet;
      await restored.loadAddresses();
      assert.deepStrictEqual(engineObjects(restored), engineObjects(wallet));

      await wallet.loadAddresses(500);
      assert.strictEqual(receive(wallet).length, 100);
      assert.strictEqual(wallet.getAddressEntries()[199].address, internal(99));
    }, 120_000);

    it('derives more ECDSA addresses as its engine would', async () => {
      const wallet = NeuraiECDSAWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      jest.spyOn(wallet as unknown as { _refetchInBackground(): void }, '_refetchInBackground').mockImplementation(() => {});
      await wallet.loadAddresses(25);
      assert.strictEqual(engineObjects(wallet).length, 50);
      assert.deepStrictEqual(engineObjects(wallet), engineObjects(await nativeWindow(NeuraiECDSAWallet, 25)).slice(0, 50));
    }, 120_000);

    it('starts again from the first address on a new testnet', () => {
      const { wallet } = withHistory([]);
      const state = wallet as unknown as { _receiveIndex: number; _receiveAddress: string; discardTestnetChainState(): void };
      state._receiveIndex = 7;
      state._receiveAddress = external(7);
      state.discardTestnetChainState();
      assert.strictEqual(state._receiveIndex, 0);
      assert.strictEqual(wallet.getAddress(), false);
    });

    /** Where the change of a 1 XNA send from `wallet` goes. */
    const changeOf = async (wallet: NeuraiHDWallet) => {
      const built = await wallet.buildSendTransaction([{ address: elsewhere, amount: '1' }]);
      const outputs = parseTransaction(built.signedHex).outputs.filter(o => o.scriptPubKeyHex !== scriptOf(elsewhere));
      assert.strictEqual(outputs.length, 1);
      return { built, change: outputs[0].scriptPubKeyHex };
    };

    it('sends each change to the change address after the last used one', async () => {
      const { wallet, history } = withHistory([]);
      const first = await changeOf(wallet);
      assert.strictEqual(first.change, scriptOf(internal(0)));
      // Broadcast, the next send no longer uses it, before any confirmation.
      await wallet.broadcastTx(first.built.signedHex);
      assert.strictEqual((await changeOf(wallet)).change, scriptOf(internal(1)));
      assert.strictEqual(await wallet.getChangeAddressAsync(), internal(1));

      history.paid = [internal(4)];
      await wallet.fetchTransactions();
      assert.strictEqual((await changeOf(wallet)).change, scriptOf(internal(5)));
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(0), 'the change does not move the receive address');
    }, 60_000);

    it('uses only the first address when the wallet is set to', async () => {
      const { wallet } = withHistory([external(0), external(1), internal(0)]);
      await wallet.fetchTransactions();
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(2));
      wallet.singleAddress = true;
      assert.strictEqual(wallet.getAddress(), external(0));
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(0));
      assert.strictEqual((await changeOf(wallet)).change, scriptOf(external(0)), 'the change comes back to it');

      // Restarted, Receive still shows it straight away.
      const restored = NeuraiHDWallet.fromJson(JSON.stringify(wallet)) as unknown as NeuraiHDWallet;
      assert.strictEqual(restored.singleAddress, true);
      assert.strictEqual(restored.getAddress(), external(0));

      // Off again, it goes on from the history.
      wallet.singleAddress = false;
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(2));
      assert.strictEqual((await changeOf(wallet)).change, scriptOf(internal(1)));
    }, 60_000);

    it('uses only the first address of every wallet with the general setting', async () => {
      const { wallet } = withHistory([external(0)]);
      await wallet.fetchTransactions();
      setSingleAddressForAll(true);
      try {
        assert.strictEqual(wallet.usesSingleAddress(), true);
        assert.strictEqual(await wallet.getReceiveAddressAsync(), external(0));
        assert.strictEqual((await changeOf(wallet)).change, scriptOf(external(0)));
        assert.strictEqual(
          NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC).usesSingleAddress(),
          false,
          'PQ wallets keep their own rule',
        );
      } finally {
        setSingleAddressForAll(false);
      }
      assert.strictEqual(await wallet.getReceiveAddressAsync(), external(1));
    }, 60_000);
  });

  describe('passphrase', () => {
    it('different passphrases yield different addresses for the same mnemonic', async () => {
      const a = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC, 'passphrase A');
      const b = NeuraiHDWallet.forNetwork('mainnet', KNOWN_MNEMONIC, 'passphrase B');
      const addrA = await a.getReceiveAddressAsync();
      const addrB = await b.getReceiveAddressAsync();
      assert.notStrictEqual(addrA, addrB);
    }, 30_000);
  });

  describe('privacy pool balance', () => {
    it('keeps the last private balance read in the pool, after a restart, until the identity changes', () => {
      const w = NeuraiPQWallet.forNetwork('testnet', KNOWN_MNEMONIC);
      assert.strictEqual(w.getPrivacyPoolBalance('pool-a'), null, 'never read here');

      assert.strictEqual(w.notePrivacyPoolBalance('pool-a', '12000000000', 100), true, 'a first reading is worth saving');
      assert.strictEqual(w.notePrivacyPoolBalance('pool-a', '12000000000', 101), false, 'the same balance again is not');
      assert.strictEqual(w.getPrivacyPoolBalance('pool-a')?.sats, 12000000000n);
      assert.strictEqual(w.getPrivacyPoolBalance('pool-b'), null, 'another pool has other notes');

      const restored = NeuraiPQWallet.fromJson(JSON.stringify(w)) as unknown as NeuraiPQWallet;
      assert.strictEqual(restored.getPrivacyPoolBalance('pool-a')?.sats, 12000000000n);
      assert.strictEqual(restored.notePrivacyPoolBalance('pool-a', '5000000000'), true, 'another balance is worth saving');

      w.setPassphrase('other identity');
      assert.strictEqual(w.getPrivacyPoolBalance('pool-a'), null);
    });
  });

  describe('pending (optimistic) transactions', () => {
    const confirmedTx = (txid: string, value: bigint, confirmations: number) => ({
      txid,
      hash: txid,
      version: 0,
      size: 0,
      vsize: 0,
      weight: 0,
      locktime: 0,
      inputs: [],
      outputs: [],
      blockhash: '',
      confirmations,
      time: 123,
      blocktime: 123,
      timestamp: 123,
      value,
    });

    it('shows a just-broadcast send as a 0-conf entry and subtracts it from the balance', () => {
      const w = new NeuraiHDWallet();
      w.balance = 1_000_000n;
      w.addPendingTx('aa', -300_000n);
      const txs = w.getTransactions();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].txid, 'aa');
      assert.strictEqual(txs[0].confirmations, 0);
      assert.strictEqual(txs[0].value, -300_000n);
      assert.strictEqual(w.getUnconfirmedBalance(), -300_000n);
      assert.strictEqual(w.getBalance(), 700_000n);
    });

    it('drops the pending entry once the tx confirms in the cache', () => {
      const w = new NeuraiHDWallet();
      w.balance = 700_000n; // backend confirmed balance after the spend mined
      w.addPendingTx('aa', -300_000n);
      (w as any)._txCache = [confirmedTx('aa', -300_000n, 1)];
      const txs = w.getTransactions();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].confirmations, 1);
      assert.strictEqual(w.getUnconfirmedBalance(), 0n);
      assert.strictEqual(w.getBalance(), 700_000n);
    });

    it('hides the duplicate but keeps deducting while the tx is only 0-conf in the cache', () => {
      const w = new NeuraiHDWallet();
      w.balance = 1_000_000n; // confirmed balance unchanged while in mempool
      w.addPendingTx('aa', -300_000n);
      (w as any)._txCache = [confirmedTx('aa', -300_000n, 0)]; // backend surfaced it 0-conf
      assert.strictEqual(w.getTransactions().length, 1, 'no duplicate row');
      assert.strictEqual(w.getUnconfirmedBalance(), -300_000n, 'still deducted until confirmed');
      assert.strictEqual(w.getBalance(), 700_000n);
    });

    it('expires a pending entry that never confirms (TTL)', () => {
      const w = new NeuraiHDWallet();
      w.balance = 1_000_000n;
      w.addPendingTx('aa', -300_000n);
      (w as any)._pendingTxs[0].timestamp = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
      assert.strictEqual(w.getTransactions().length, 0);
      assert.strictEqual(w.getUnconfirmedBalance(), 0n);
      assert.strictEqual(w.getBalance(), 1_000_000n);
    });

    it('does not double-count against a server-reported unconfirmed balance', () => {
      const w = new NeuraiPQWallet();
      w.balance = 1_000_000n;
      w.unconfirmed_balance = -300_000n; // PQ push already reflected the same spend
      w.addPendingTx('aa', -300_000n);
      assert.strictEqual(w.getUnconfirmedBalance(), -300_000n); // min(-300k, -300k), not -600k
      assert.strictEqual(w.getBalance(), 700_000n);
    });

    it('ignores a duplicate addPendingTx for the same txid', () => {
      const w = new NeuraiHDWallet();
      w.balance = 1_000_000n;
      w.addPendingTx('aa', -300_000n);
      w.addPendingTx('aa', -300_000n);
      assert.strictEqual(w.getTransactions().length, 1);
      assert.strictEqual(w.getUnconfirmedBalance(), -300_000n);
    });
  });

  describe('library transaction sizing and exact fees', () => {
    const legacyScript = '76a914' + '00'.repeat(20) + '88ac';
    // Witness v1: OP_1 (0x51) + push-32 (0x20) + a 32-byte program. The old
    // fixture used '5114' (push-20), which `isPQScript` does not match, so this
    // suite measured the LEGACY branch and never covered PQ sizing at all.
    const pqScript = '5120' + '00'.repeat(32);
    // The fixture keeps the 4.x `nq1p…` string; libraries only accept its `nc1p…` encoding.
    const pqFixtureAddress = bech32m.encode('nc', bech32m.decode(fixtures.fixtures[2].addresses[0], 120).words, 120);

    it('uses conservative serialized legacy signatures and decimal kilobytes', () => {
      assert.strictEqual(estimateNeuraiTxSizeKb([legacyScript], [fixtures.fixtures[0].addresses[0]]), 193 / 1000);
      assert.strictEqual(estimateNeuraiFeeSats([legacyScript], [fixtures.fixtures[0].addresses[0]], 0.05), 965_000n);
    });

    it('counts asset payloads, mixed destinations, and CompactSize boundaries', () => {
      const address = fixtures.fixtures[0].addresses[0];
      const pqAddress = pqFixtureAddress;
      const plain = estimateNeuraiFeeSats([legacyScript], [address], 0.012);
      expect(plain).toBe(231_600n);
      expect(estimateNeuraiFeeSats([legacyScript], [pqAddress], 0.012)).toBe(plain + 9n * 1200n);
      expect(estimateNeuraiFeeSats([legacyScript], [{ address, assetName: 'FEE_TEST' }], 0.012)).toBeGreaterThan(plain);
      const before = estimateNeuraiFeeSats(Array(252).fill(legacyScript), [address], 0.012);
      const after = estimateNeuraiFeeSats(Array(253).fill(legacyScript), [address], 0.012);
      expect(after - before).toBe((149n + 2n) * 1200n);
    });

    it('rounds fractional satoshi fees up and rejects invalid rates', () => {
      const outputs = [fixtures.fixtures[0].addresses[0]];
      expect(estimateNeuraiFeeSats([legacyScript], outputs, 0.00000001)).toBe(1n);
      expect(() => estimateNeuraiFeeSats([legacyScript], outputs, NaN)).toThrow('Invalid fee');
      expect(() => estimateNeuraiFeeSats([legacyScript], outputs, -1)).toThrow('Invalid fee');
    });

    it('accounts for the PQ witness discount', () => {
      assert.strictEqual(estimateNeuraiTxSizeKb([pqScript], [pqFixtureAddress]), 1031 / 1000);
      assert.strictEqual(estimateNeuraiFeeSats([pqScript], [pqFixtureAddress], 0.05), 5_155_000n);
    });
  });
});

describe('exact send preflight', () => {
  it('rejects duplicated recipients and invalid precision before building', async () => {
    const wallet = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
    await expect(
      wallet.buildSendTransaction([
        { address: 'same', amount: '1' },
        { address: 'same', amount: '2' },
      ]),
    ).rejects.toThrow('Duplicate');
    await expect(wallet.buildSendTransaction([{ address: 'same', amount: '0.000000001' }])).rejects.toThrow('8 decimal');
  });
  it('does not unlock an obsolete wallet when balance refresh fails', async () => {
    const wallet = NeuraiHDWallet.forNetwork('testnet', KNOWN_MNEMONIC);
    wallet.amountsStale = true;
    const backend = new RpcBackend({ chain: 'xna-test', url: 'http://127.0.0.1:19215' });
    jest.spyOn(backend, 'getBalance').mockRejectedValue(new Error('Offline'));
    wallet.setBackend(backend);
    await expect(wallet.fetchBalance()).rejects.toThrow('Offline');
    expect(wallet.amountsStale).toBe(true);
  });
});

it('subtracts a one-satoshi pending debit above the safe integer boundary exactly', () => {
  const wallet = new NeuraiHDWallet();
  wallet.balance = 9007199254740993n;
  wallet.addPendingTx('one-satoshi', -1n);
  expect(wallet.getBalance()).toBe(9007199254740992n);
});
