import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDLegacyBreadwalletWallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  await sleep(20);
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

it('Legacy HD Breadwallet can fetch balance and create transaction', async () => {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }
  const wallet = new HDLegacyBreadwalletWallet();
  wallet.setSecret(process.env.HD_MNEMONIC_BREAD);

  await wallet.fetchBalance();

  // m/0'/0/1 1K9ofAnenRn1aR9TMMTreiin9ddjKWbS7z x 0.0001
  // m/0'/0/2 bc1qh0vtrnjn7zs99j4n6xaadde95ctnnvegh9l2jn x 0.00032084
  // m/0'/1/0 1A9Sc4opR6c7Ui6NazECiGmsmnUPh2WeHJ x 0.00016378 BTC
  // m/0'/1/1 bc1qksn08tz44fvnnrpgrrexvs9526t6jg3xnj9tpc x 0.00012422
  // 0.0001 + 0.00016378 + 0.00012422 + 0.00032084 = 0.00070884
  assert.strictEqual(wallet.getBalance(), 70884);

  // try to create a tx
  await wallet.fetchUtxo();
  const { tx } = wallet.createTransaction(
    wallet.getUtxo(),
    [{ address: 'bc1q47efz9aav8g4mnnz9r6ql4pf48phy3g509p7gx' }],
    1,
    'bc1qk9hvkxqsqmps6ex3qawr79rvtg8es4ecjfu5v0',
  );

  const transaction = bitcoin.Transaction.fromHex(tx.toHex());
  assert.ok(transaction.ins.length === 4);
  assert.strictEqual(transaction.outs.length, 1);
});
