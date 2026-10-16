import net from 'net';
import { createHash } from 'crypto';
import { address, Transaction } from 'bitcoinjs-lib';
import { ADDRESS, DISCOVERY_ADDRESSES, DISCOVERY_MNEMONIC, FUNDING_TXID, MNEMONIC, VALUES, startElectrum } from '../e2e-appium/electrum';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import contacts from '../e2e-appium/fixtures/contacts.json';

const ElectrumClient = require('electrum-client');

it('builds a silent-payment fixture from the public funding input', () => {
  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(MNEMONIC);
  wallet.switchBIP47(true);
  expect(wallet.getBIP47PaymentCode()).toBe(contacts.ownPaymentCode);
  const { tx } = wallet.createTransaction(
    [{ txid: FUNDING_TXID, vout: 0, address: ADDRESS, value: VALUES[0], wif: wallet._getWIFbyAddress(ADDRESS) as string }],
    [
      { address: contacts.address, value: 10000 },
      { address: contacts.silentPayment, value: 20000 },
    ],
    2,
    wallet._getInternalAddressByIndex(0),
  );
  expect(tx).toBeDefined();
  expect(tx!.outs).toHaveLength(3);
  expect(address.fromOutputScript(tx!.outs[0].script)).toBe(contacts.address);
  expect(tx!.outs[0].value).toBe(10000n);
  expect(tx!.outs[1].value).toBe(20000n);
  expect(Buffer.from(tx!.outs[1].script).toString('hex')).toBe(contacts.silentPaymentScript);
});

it('serves the local funding transaction through the real Electrum client and rejects broadcasts', async () => {
  const fixture = await startElectrum();
  const client = new ElectrumClient(net, null, fixture.port, '127.0.0.1', 'tcp');
  try {
    await client.initElectrum({ client: 'fixture-test', version: '1.4' }, { maxRetry: 0 });
    const scriptHash = createHash('sha256').update(address.toOutputScript(ADDRESS)).digest().reverse().toString('hex');
    const balances = await client.blockchainScripthash_getBalanceBatch([scriptHash, '00'.repeat(32)]);
    expect(balances.map((entry: any) => entry.result.confirmed)).toEqual([108909, 0]);
    const raw = await client.blockchainTransaction_get(FUNDING_TXID, false);
    const transaction = Transaction.fromHex(raw);
    expect(transaction.getId()).toBe(FUNDING_TXID);
    expect(transaction.outs.map(output => Number(output.value))).toEqual(VALUES);
    expect(transaction.outs.every(output => address.fromOutputScript(output.script) === ADDRESS)).toBe(true);
    await expect(client.blockchainTransaction_broadcast(raw)).rejects.toMatchObject({ message: 'Broadcast is disabled in E2E' });
  } finally {
    client.close();
    clearTimeout(client.timeout);
    await fixture.close();
  }
});

it('provides consistent used BIP44 and BIP84 accounts for the public discovery seed', async () => {
  const fixture = await startElectrum();
  const client = new ElectrumClient(net, null, fixture.port, '127.0.0.1', 'tcp');
  try {
    await client.initElectrum({ client: 'discovery-test', version: '1.4' }, { maxRetry: 0 });
    for (const [index, Wallet] of [HDLegacyP2PKHWallet, HDSegwitBech32Wallet].entries()) {
      const wallet = new Wallet();
      wallet.setSecret(DISCOVERY_MNEMONIC);
      const outputAddress = wallet._getExternalAddressByIndex(0);
      expect(outputAddress).toBe(DISCOVERY_ADDRESSES[index]);
      const scriptHash = createHash('sha256').update(address.toOutputScript(outputAddress)).digest().reverse().toString('hex');
      const history = await client.blockchainScripthash_getHistory(scriptHash);
      expect(history).toHaveLength(1);
      expect(await client.blockchainScripthash_getBalance(scriptHash)).toEqual({ confirmed: 25000, unconfirmed: 0 });
      const tx = Transaction.fromHex(await client.blockchainTransaction_get(history[0].tx_hash, false));
      expect(tx.outs[index].value).toBe(25000n);
      expect(address.fromOutputScript(tx.outs[index].script)).toBe(outputAddress);
      const verbose = await client.blockchainTransaction_get(history[0].tx_hash, true);
      expect(verbose.vout[index].scriptPubKey.address).toBe(outputAddress);
    }
  } finally {
    client.close();
    clearTimeout(client.timeout);
    await fixture.close();
  }
});
