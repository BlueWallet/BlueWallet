import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { HDSegwitBech32Wallet } from '../../class';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';

// Mock AsyncStorage using fs in tests/integration/fixtures/ark/
jest.mock('@react-native-async-storage/async-storage', () => {
  const STORAGE_DIR = path.join(__dirname, 'fixtures', 'ark');

  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const getFilePath = (key: string) => {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(STORAGE_DIR, sanitizedKey);
  };

  async function _multiSet(keyValuePairs: [string, string][], callback?: any) {
    keyValuePairs.forEach(keyValue => {
      const key = keyValue[0];
      const value = keyValue[1];
      const filePath = getFilePath(key);
      fs.writeFileSync(filePath, value, 'utf8');
    });
    callback && callback(null);
    return null;
  }

  async function _multiGet(keys: string[], callback?: any) {
    const values = keys.map(key => {
      const filePath = getFilePath(key);
      let value = null;
      try {
        if (fs.existsSync(filePath)) {
          value = fs.readFileSync(filePath, 'utf8');
        }
      } catch (error) {
        // ignore
      }
      return [key, value];
    });
    callback && callback(null, values);
    return values;
  }

  async function _multiRemove(keys: string[], callback?: any) {
    keys.forEach(key => {
      const filePath = getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    callback && callback(null);
    return null;
  }

  async function _clear(callback?: any) {
    if (fs.existsSync(STORAGE_DIR)) {
      const files = fs.readdirSync(STORAGE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(STORAGE_DIR, file));
      }
    }
    callback && callback(null);
    return null;
  }

  async function _getAllKeys() {
    if (!fs.existsSync(STORAGE_DIR)) {
      return [];
    }
    return fs.readdirSync(STORAGE_DIR);
  }

  const asMock: any = {
    setItem: jest.fn(async (key: string, value: string, callback?: any) => {
      const setResult = await asMock.multiSet([[key, value]], undefined);
      callback && callback(setResult);
      return setResult;
    }),

    getItem: jest.fn(async (key: string, callback?: any) => {
      const getResult = await asMock.multiGet([key], undefined);
      const result = getResult[0] ? getResult[0][1] : null;
      callback && callback(null, result);
      return result;
    }),

    removeItem: jest.fn((key: string, callback?: any) => asMock.multiRemove([key], callback)),

    clear: jest.fn(_clear),
    getAllKeys: jest.fn(_getAllKeys),
    flushGetRequests: jest.fn(),

    multiGet: jest.fn(_multiGet),
    multiSet: jest.fn(_multiSet),
    multiRemove: jest.fn(_multiRemove),
  };

  return asMock;
});

jest.setTimeout(30_000);

const w = new LightningArkWallet();

beforeAll(async () => {
  if (!process.env.HD_MNEMONIC_OLD) {
    console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
    return;
  }
  w.setSecret('arkade://' + process.env.HD_MNEMONIC_OLD);
  await w.init();
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 3_000)); // sleep
});

describe('LightningArkWallet', () => {
  it('can generate', async () => {
    const wGenerated = new LightningArkWallet();
    await wGenerated.generate();

    assert.ok(wGenerated.getSecret().startsWith('arkade://'));

    const mnemonics = wGenerated.getSecret().replace('arkade://', '');
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonics);
    assert.ok(hd.validateMnemonic());
  });

  it('can fetch balance', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.fetchBalance();
    const balance = w.getBalance();

    assert.ok(balance > 0);
  });

  it('can decode invoice', async () => {
    const invoice =
      'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';

    const decoded = w.decodeInvoice(invoice);

    assert.strictEqual(decoded.num_satoshis, 2);
    assert.strictEqual(decoded.num_millisatoshis, 2000);
    assert.strictEqual(decoded.timestamp, 1750701686);
    assert.strictEqual(decoded.expiry, 2592000);
    assert.strictEqual(decoded.description, 'Two days ');
    assert.strictEqual(decoded.payment_hash, '3c2a54ff3f8e054e47e3664e0c8046fc8dbe3d12ebf59fa70870ccac96602d0b');
    assert.strictEqual(decoded.destination, '030936e7a016fb3f5ce53c8db29da2b6dfbf8e068ea058c363e0fd77f444270d8a');
    assert.strictEqual(decoded.fallback_addr, '');
    assert.strictEqual(decoded.description_hash, '');
    assert.strictEqual(decoded.cltv_expiry, '40');
    assert.strictEqual(decoded.route_hints.length, 0); // decode function does not decode this yet cause we dont need it for now
  });

  it('can tell if invoice expired', async () => {
    const invoice =
      'lnbc6670n1p5jp0p9pp5jmyumdwfejjxzwhxh7wnckeugcwcpkqtf5t6dh2fzykjjh4hkatqdq6235x2grhdaexggrs09exzmtfvscqz3txqyyzzssp5ae74xvmlk5q6vxsxe3sqm90w2x4x0ekejt7qp9ca5zzhu83ru8hq9qxpqysgql4dexpmwacw98va6v6smww69a3w6hs5ng0573v8skyhlj7lylt8r65jm5zqaa7hzx3vlrs2fr3h0rtqjw7x94xprdwqy6rr9ff5pnxsppnpr5q';
    assert.strictEqual(w.isInvoiceExpired(invoice), true);
    assert.strictEqual(w.isInvoiceExpired(invoice, 1763752997), false);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can create invoice', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    const invoice = await w.addInvoice(1000, 'test invoice');
    console.log(invoice);
  });

  it('can fetch txs', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.fetchTransactions();
    await w.fetchUserInvoices();

    const txs = w.getTransactions();
    assert.ok(txs.length > 0);

    // Find the reverse swap (incoming) transaction
    const receiveTx = txs.find(t => t.value! > 0);
    assert.ok(receiveTx, 'Should have at least one receive transaction');
    assert.strictEqual(receiveTx.memo, 'test invoice');
    assert.strictEqual(receiveTx.value, 9999);
    assert.strictEqual(receiveTx.timestamp, 1761224952);
    assert.strictEqual(receiveTx.ispaid, true);
    assert.ok(receiveTx.payment_hash);
    assert.ok(receiveTx.payment_request);
    assert.strictEqual(receiveTx.payment_preimage, '7244f7e956a91171038ea935d56cdb758cc36c345f0aa92764bfed6fe6fc9b17');

    // Find the submarine swap (outgoing) transaction
    const sendTx = txs.find(t => t.value! < 0);
    assert.ok(sendTx, 'Should have at least one send transaction');
    assert.strictEqual(sendTx.value, -8001);
    assert.strictEqual(sendTx.timestamp, 1761225645);
    assert.strictEqual(sendTx.ispaid, true);
    assert.ok(sendTx.payment_hash);
    assert.ok(sendTx.payment_request);
    assert.strictEqual(sendTx.payment_preimage, '182fb8f273bda01b22c0e91991e093e18b2970f389fc7f7a2121870324eb2de5');

    const invoices = await w.getUserInvoices();
    assert.ok(invoices.length > 0);
    assert(invoices[0].value! > 0);
    assert(invoices[0].ispaid);

    assert.ok(
      w.isInvoiceGeneratedByWallet(
        'lnbc100u1p50528cpp5rhy4fgs0ff23asecxtxt9zvc3apn0p8h7fxsj0d5k7j3x92zwhlqdq5w3jhxapqd9h8vmmfvdjscqrp80xqyf8ucsp5vcsrzye432n9wh0zwuv5z8y5n9zvkwpctr685e80utzc2yueccms9qxpqysgqd87swq3hput9k6llp0wxg098hc7ge3e5nrtnvak6zreywzaf4k9s8d3u4hrmt3m22kf0jt7ruqj0caknk5ykzdenjdphz50t7xrstnqqn6aw0m',
      ),
    );
    assert.ok(
      !w.isInvoiceGeneratedByWallet(
        'lnbc80u1p5052hwpp5z4ln6hyq4wcck809pt7f0q54ag5he6ce797flm7gl9vuccm9lx2sdqqcqzysxqyz5vqsp5nh9fl4g36606tvxswtnfxzy55yze2656cw2fya7dhl8r6u0czyds9qxpqysgq83sw25g9d9ltr05nkfzejnvvunzkrk4qeuxhszuvvsguk5m6vmg3a7n5nd67l9frru3kjzpt8x6jfusjyc7ezh49jeeh900kt3v30qsqzq7fst',
      ),
    );
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can pay invoice', async () => {
    if (!process.env.HD_MNEMONIC_OLD) {
      console.error('process.env.HD_MNEMONIC_OLD not set, skipped');
      return;
    }

    await w.payInvoice(
      'lnbc80u1p5052hwpp5z4ln6hyq4wcck809pt7f0q54ag5he6ce797flm7gl9vuccm9lx2sdqqcqzysxqyz5vqsp5nh9fl4g36606tvxswtnfxzy55yze2656cw2fya7dhl8r6u0czyds9qxpqysgq83sw25g9d9ltr05nkfzejnvvunzkrk4qeuxhszuvvsguk5m6vmg3a7n5nd67l9frru3kjzpt8x6jfusjyc7ezh49jeeh900kt3v30qsqzq7fst',
    );
  });

  it('can validate ark native address', async () => {
    assert.ok(
      w.isAddressValid(
        'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t5z8sz5n95k570z5r004szc9h2q3qprkzdd5zveujdpx24srcrqg8hf6j4v',
      ),
    );
    assert.ok(
      w.isAddressValid(
        'ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9rw',
      ),
    );

    assert.ok(
      !w.isAddressValid(
        'ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9r',
      ),
    );
    assert.ok(
      !w.isAddressValid('ark1qqellv77udfmr20tun8dvju5vgudpf9vxe8jwhthrkn26fz96pawqfdy8nk05rsmrf8h94j26905e7n6sng8y059z8ykn2j5xcuw4xt8ngt9'),
    );
    assert.ok(
      w.isAddressValid(
        'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t4sedhdvfcgaky2qk2p55wj4ut38v9tnpuvjr8ee8hv6htp23pzjpwx5esw',
      ),
    );
    assert.ok(!w.isAddressValid('ark1sfhshhehehwer'));
    assert.ok(!w.isAddressValid('test'));
  });
});
