import { Transaction, Psbt } from 'bitcoinjs-lib';
import { NeuraiESP32, INeuraiTransport, encodeDestinationScript } from '@neuraiproject/neurai-sign-esp32/react-native';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { getPQAuthScriptAddress } from '@neuraiproject/neurai-key';
import { deriveLegacyAddress } from '../../blue_modules/neurai-hw/xpubDerivation';
import { RpcBackend } from '../../blue_modules/neurai/RpcBackend';

// The device signs generic AuthScript witness v1 (`tnc1p…`) inputs, not the
// strict PQ v2 addresses software testnet wallets now use.
const deviceAuthScriptAddress = () =>
  getPQAuthScriptAddress('xna-authscript-test', 'result pact model attract result puzzle final boss private educate luggage era', 0, 0)
    .address;

const xpub = 'xpub661MyMwAqRbcGmUDQVKxmhEESB5xTk8hbsdTSV3Pmhm3HE9Fj3s45R9Y8LwyaQWjXXPytZjuhTKSyCBPeNrB1VVWQq1HCvjbEZ27k44oNmg';
const recipient = deriveLegacyAddress(xpub, 'xna-test', 0, 9).address;

function fixture(amount: bigint, keyType: 'legacy' | 'pq' = 'legacy', address?: string) {
  const wallet = new NeuraiHardwareWallet();
  wallet.keyType = keyType;
  wallet.network = keyType === 'legacy' ? 'xna-test' : 'xna-pq-test';
  wallet.xpub = keyType === 'legacy' ? xpub : '';
  wallet.accountPath = "m/44'/1'/0'";
  wallet.hwFingerprint = '168dd603';
  wallet.address = address ?? deriveLegacyAddress(xpub, 'xna-test', 0, 0).address;
  const previous = new Transaction();
  previous.addInput(Buffer.alloc(32, 1), 0);
  previous.addOutput(encodeDestinationScript(wallet.address), amount);
  const utxo = {
    address: wallet.address,
    txid: previous.getId(),
    outputIndex: 0,
    satoshis: amount.toString(),
    assetName: 'XNA',
    script: Buffer.from(previous.outs[0].script).toString('hex'),
  };
  const backend = new RpcBackend({
    chain: wallet.network,
    url: 'http://127.0.0.1:19211',
  });
  const rpc = jest.spyOn(backend, 'rpc').mockImplementation(async method => {
    if (method === 'getaddressutxos') return [utxo];
    if (method === 'getaddressmempool') return [];
    if (method === 'getrawtransaction') return previous.toHex();
    throw new Error('Unexpected RPC: ' + method);
  });
  jest.spyOn(backend, 'getAddressHistory').mockResolvedValue([]);
  wallet.setBackend(backend);
  return { wallet, previous, rpc, utxo };
}

// Exercise the real SDK's JSON boundary, without pretending to sign in firmware.
function recordingDevice() {
  const sendCommandHeartbeat = jest.fn(async (_command: Record<string, unknown>) => {
    throw new Error('transport capture complete');
  });
  const transport: INeuraiTransport = {
    connected: true,
    open: async () => {},
    close: async () => {},
    sendCommand: async () => ({ status: 'ok', device: 'NeuraiHW' }) as Awaited<ReturnType<INeuraiTransport['sendCommand']>>,
    sendCommandFinal: sendCommandHeartbeat,
    sendCommandHeartbeat,
  };
  return { device: new NeuraiESP32({ transport }), sendCommandHeartbeat };
}

test.each([false, true])('builds a legacy PSBT with exact odd large prevout and outputs (sendMax=%s)', async sendMax => {
  const total = 10000000000000001n;
  const { wallet, previous } = fixture(total);
  const result = await wallet.buildUnsignedSend(recipient, 100000000n, {
    feeRate: 1,
    sendMax,
  });
  const psbt = Psbt.fromBase64(result.psbtBase64!);
  expect(Transaction.fromBuffer(psbt.data.inputs[0].nonWitnessUtxo!).outs[0].value).toBe(total);
  expect(Buffer.from(psbt.txInputs[0].hash)).toEqual(Buffer.from(previous.getHash()));
  expect(psbt.txOutputs[0].value).toBe(result.amountSats);
  expect(psbt.txOutputs.reduce((sum, o) => sum + o.value, result.feeSats)).toBe(total);
  if (sendMax) expect(result.amountSats).toBeGreaterThan(9007199254740991n);
  else expect(psbt.txOutputs[1].value).toBe(total - result.amountSats - result.feeSats);
});

test.each([false, true])('builds and transports exact large PQ amounts (sendMax=%s)', async sendMax => {
  const address = deviceAuthScriptAddress();
  const total = 10000000000000001n;
  const { wallet, utxo } = fixture(total, 'pq', address);
  const result = await wallet.buildUnsignedSend(recipient, 100000001n, {
    feeRate: 1,
    sendMax,
  });
  expect(result.inputs![0].amount).toBe(total.toString());
  const tx = Transaction.fromHex(result.rawTxHex!);
  expect(tx.outs[0].value).toBe(result.amountSats);
  expect(tx.outs.reduce((sum, out) => sum + out.value, result.feeSats)).toBe(total);
  if (sendMax) expect(result.amountSats).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
  const { device, sendCommandHeartbeat } = recordingDevice();
  await expect(wallet.signWithDevice(device, result)).rejects.toThrow('transport capture complete');
  const command = JSON.parse(JSON.stringify(sendCommandHeartbeat.mock.calls[0][0]));
  expect(command.action).toBe('sign_tx');
  expect(command.tx).toBe(result.rawTxHex);
  expect(command.inputs).toEqual([{ index: 0, amount: total.toString(), script_pub_key: utxo.script }]);
});

it('builds safe PQ signing metadata and conserves every satoshi', async () => {
  const address = deviceAuthScriptAddress();
  const total = 9007199254740991n;
  const { wallet, utxo } = fixture(total, 'pq', address);
  const result = await wallet.buildUnsignedSend(recipient, 100000001n, {
    feeRate: 1,
  });
  expect(result.inputs![0].amount).toBe(total.toString());
  const { device, sendCommandHeartbeat } = recordingDevice();
  await expect(wallet.signWithDevice(device, result)).rejects.toThrow('transport capture complete');
  const command = JSON.parse(JSON.stringify(sendCommandHeartbeat.mock.calls[0][0]));
  expect(command.inputs[0].amount).toBe(Number.MAX_SAFE_INTEGER);
  expect(result.inputs![0].script_pub_key).toBe(utxo.script);
  const tx = Transaction.fromHex(result.rawTxHex!);
  expect(tx.outs[0].value).toBe(100000001n);
  expect(tx.outs.reduce((sum, out) => sum + out.value, result.feeSats)).toBe(total);
});

it('excludes pending spends and propagates mempool failures before building', async () => {
  const { wallet, rpc, utxo } = fixture(100000000n);
  rpc.mockImplementation(async method => {
    if (method === 'getaddressutxos') return [utxo];
    if (method === 'getaddressmempool') return [{ prevtxid: utxo.txid, prevout: 0 }];
    throw new Error('Unexpected');
  });
  await expect(wallet.buildUnsignedSend(recipient, 1n, { feeRate: 1 })).rejects.toThrow('No spendable');
  rpc.mockRejectedValue(new Error('Node unavailable'));
  await expect(wallet.buildUnsignedSend(recipient, 1n, { feeRate: 1 })).rejects.toThrow('Node unavailable');
});

it('accounts for a one-satoshi dust change in the exact fee', async () => {
  const { wallet } = fixture(100000227n);
  const result = await wallet.buildUnsignedSend(recipient, 100000000n, {
    feeRate: 1,
  });
  const psbt = Psbt.fromBase64(result.psbtBase64!);
  expect(psbt.txOutputs).toHaveLength(1);
  expect(psbt.txOutputs[0].value).toBe(100000000n);
  expect(result.feeSats).toBe(227n);
});

it('keeps asset sighash amounts zero and large XNA fees inputs exact through the SDK', async () => {
  const address = deviceAuthScriptAddress();
  const total = 10000000000000001n;
  const { wallet, rpc, utxo } = fixture(total, 'pq', address);
  jest.spyOn(wallet, 'estimateFeeRate').mockResolvedValue(0.01);
  rpc.mockImplementation(async method => {
    if (method === 'getaddressutxos') {
      return [
        utxo,
        {
          ...utxo,
          txid: '02'.repeat(32),
          assetName: 'LARGE',
          satoshis: total.toString(),
        },
      ];
    }
    if (method === 'getaddressmempool') return [];
    throw new Error('Unexpected RPC: ' + method);
  });
  const result = await wallet.buildUnsignedAssetSend(recipient, 'LARGE', '100000000.00000001');
  expect(result.inputs!.map(input => input.amount)).toEqual([0, total.toString()]);
  const tx = Transaction.fromHex(result.rawTxHex!);
  expect(tx.outs.reduce((sum, out) => sum + out.value, result.feeSats)).toBe(total);
  const { device, sendCommandHeartbeat } = recordingDevice();
  await expect(wallet.signWithDevice(device, result)).rejects.toThrow('transport capture complete');
  const command = JSON.parse(JSON.stringify(sendCommandHeartbeat.mock.calls[0][0]));
  expect(command.inputs.map((input: { amount: string | number }) => input.amount)).toEqual([0, total.toString()]);
  expect(JSON.stringify(command.display)).toContain('100000000.00000001');
});

it('rejects already rounded amounts before sending a signing command', async () => {
  const { device, sendCommandHeartbeat } = recordingDevice();
  await expect(
    device.signPqRawTransaction({
      txHex: '',
      inputs: [{ index: 0, amount: Number('10000000000000001'), script_pub_key: '' }],
    }),
  ).rejects.toThrow();
  expect(sendCommandHeartbeat).not.toHaveBeenCalled();
});

// ---- H16 · the signed PQ transaction must be the reviewed draft plus signatures ----

/** A device double that answers `sign_tx` with `respond(draftHex)`. */
function signingDevice(respond: (draftHex: string) => string, order: string[] = []) {
  const transport: INeuraiTransport = {
    connected: true,
    open: async () => {},
    close: async () => {},
    sendCommand: async () => {
      order.push('ping');
      return { status: 'ok', device: 'NeuraiHW' } as Awaited<ReturnType<INeuraiTransport['sendCommand']>>;
    },
    sendCommandFinal: async () => ({}) as never,
    sendCommandHeartbeat: async (command: Record<string, unknown>) => {
      order.push('sign');
      return { status: 'success', tx: respond(command.tx as string) } as never;
    },
  };
  return new NeuraiESP32({ transport });
}

const withSignature = (tx: Transaction) => {
  tx.ins.forEach(input => {
    input.witness = [Buffer.alloc(2420, 7), Buffer.from('51', 'hex')];
  });
  return tx;
};

async function pqDraft() {
  const { wallet } = fixture(5000000000n, 'pq', deviceAuthScriptAddress());
  const draft = await wallet.buildUnsignedSend(recipient, 100000001n, { feeRate: 1 });
  return { wallet, draft };
}

it('accepts a device response that only adds signatures', async () => {
  const { wallet, draft } = await pqDraft();
  const device = signingDevice(hex => withSignature(Transaction.fromHex(hex)).toHex());
  const signed = await wallet.signWithDevice(device, draft);
  expect(signed.txId).toBe(Transaction.fromHex(draft.rawTxHex!).getId());
});

const tampering: Array<[string, (tx: Transaction) => void]> = [
  [
    'amount',
    tx => {
      tx.outs[0].value = tx.outs[0].value + 1n;
    },
  ],
  [
    'destination',
    tx => {
      tx.outs[0].script = Buffer.from('76a914' + '11'.repeat(20) + '88ac', 'hex');
    },
  ],
  [
    'extra output',
    tx => {
      tx.addOutput(Buffer.from('76a914' + '22'.repeat(20) + '88ac', 'hex'), 1000n);
    },
  ],
  [
    'input',
    tx => {
      tx.ins[0].index = 7;
    },
  ],
  [
    'sequence',
    tx => {
      tx.ins[0].sequence = 0;
    },
  ],
  [
    'lock time',
    tx => {
      tx.locktime = 99;
    },
  ],
];

test.each(tampering)('rejects a signed transaction with a different %s before any broadcast', async (_label, tamper) => {
  const { wallet, draft } = await pqDraft();
  const broadcast = jest.spyOn(wallet, 'broadcastTx');
  const device = signingDevice(hex => {
    const tx = withSignature(Transaction.fromHex(hex));
    tamper(tx);
    return tx.toHex();
  });
  await expect(wallet.signWithDevice(device, draft)).rejects.toThrow('differs from the one you approved');
  expect(broadcast).not.toHaveBeenCalled();
});

it('rejects a response that carries no signature', async () => {
  const { wallet, draft } = await pqDraft();
  const device = signingDevice(hex => hex);
  await expect(wallet.signWithDevice(device, draft)).rejects.toThrow('is not signed');
});

// ---- H18 · one turn of the device queue for ping + sign, one shared link ----

it('keeps ping and sign together: a queued chat command waits until signing ends', async () => {
  const { withDevice }: typeof import('../../blue_modules/neurai-hw/deviceQueue') = require('../../blue_modules/neurai-hw/deviceQueue');
  const { wallet, draft } = await pqDraft();
  const order: string[] = [];
  const device = signingDevice(hex => withSignature(Transaction.fromHex(hex)).toHex(), order);
  const signing = wallet.signWithDevice(device, draft);
  const chat = withDevice(async () => {
    order.push('chat');
  });
  await Promise.all([signing, chat]);
  expect(order).toEqual(['ping', 'sign', 'chat']);
});

describe('shared USB link', () => {
  const link: typeof import('../../blue_modules/neurai-hw/sharedLink') = require('../../blue_modules/neurai-hw/sharedLink');
  type FakeDevice = { ping: jest.Mock; disconnect: jest.Mock };
  const fakeDevice = (): FakeDevice => ({ ping: jest.fn(async () => ({ device: 'NeuraiHW' })), disconnect: jest.fn(async () => {}) });
  const asDevice = (device: FakeDevice) => device as unknown as NeuraiESP32;
  beforeEach(() => link.resetLinkForTests());

  it('opens once for two screens asking at the same time', async () => {
    const device = fakeDevice();
    const open = jest.fn(async () => asDevice(device));
    const [a, b] = await Promise.all([link.acquireLink('send', open), link.acquireLink('chat', open)]);
    expect(open).toHaveBeenCalledTimes(1);
    expect(a).toBe(asDevice(device));
    expect(b).toBe(asDevice(device));
  });

  it('keeps the port open while another screen holds it, and closes it with the last one', async () => {
    const device = fakeDevice();
    await link.acquireLink('chat', async () => asDevice(device));
    await link.acquireLink('send', async () => asDevice(device));
    await link.releaseLink('send');
    expect(device.disconnect).not.toHaveBeenCalled();
    expect(link.currentLink()).toBe(asDevice(device));
    await link.releaseLink('chat');
    expect(device.disconnect).toHaveBeenCalledTimes(1);
    expect(link.currentLink()).toBeNull();
  });

  it('reopens when the shared link stopped answering', async () => {
    const dead = fakeDevice();
    dead.ping.mockRejectedValue(new Error('unplugged'));
    await link.acquireLink('chat', async () => asDevice(dead));
    const fresh = fakeDevice();
    const reopened = await link.acquireLink('send', async () => asDevice(fresh));
    expect(reopened).toBe(asDevice(fresh));
    expect(dead.disconnect).toHaveBeenCalledTimes(1);
  });

  it('shares a failed open with every waiter and allows a later retry', async () => {
    const open = jest.fn(async (): Promise<NeuraiESP32> => {
      throw new Error('USB permission denied');
    });
    const results = await Promise.allSettled([link.acquireLink('a', open), link.acquireLink('b', open)]);
    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
    expect(open).toHaveBeenCalledTimes(1);
    const device = fakeDevice();
    await expect(link.acquireLink('a', async () => asDevice(device))).resolves.toBe(asDevice(device));
  });
});

describe('shared USB link · release during an acquisition (review 7)', () => {
  const link: typeof import('../../blue_modules/neurai-hw/sharedLink') = require('../../blue_modules/neurai-hw/sharedLink');
  beforeEach(() => link.resetLinkForTests());

  it('does not close the port under a screen whose ping is still pending', async () => {
    let answer!: () => void;
    const device = {
      ping: jest.fn(() => new Promise(resolve => (answer = () => resolve({ device: 'NeuraiHW' })))),
      disconnect: jest.fn(async () => {}),
    };
    const asDevice = device as unknown as NeuraiESP32;
    await link.acquireLink('send', async () => asDevice); // opens: no ping

    const chat = link.acquireLink('chat', async () => asDevice); // reuses: waits on its ping
    // eslint-disable-next-line no-unmodified-loop-condition -- set by the device double once the queued ping runs
    while (!answer) await Promise.resolve();
    const released = link.releaseLink('send'); // the last other holder leaves meanwhile
    answer();
    expect(await chat).toBe(asDevice);
    await released;
    expect(device.disconnect).not.toHaveBeenCalled();
    expect(link.currentLink()).toBe(asDevice);
  });
});

describe('shared USB link · two screens reconnecting together (second review)', () => {
  const link: typeof import('../../blue_modules/neurai-hw/sharedLink') = require('../../blue_modules/neurai-hw/sharedLink');
  beforeEach(() => link.resetLinkForTests());
  const fake = (alive: boolean) => ({
    ping: jest.fn(async () => {
      if (!alive) throw new Error('unplugged');
      return { device: 'NeuraiHW' };
    }),
    disconnect: jest.fn(async () => {}),
  });

  it.each(['chat leaves first', 'send leaves first'])('both hold the reopened port; %s and the other keeps it', async order => {
    const dead = fake(false);
    await link.acquireLink('setup', async () => dead as unknown as NeuraiESP32);
    const fresh = fake(true);
    const open = jest.fn(async () => fresh as unknown as NeuraiESP32);

    const [chat, send] = await Promise.all([link.acquireLink('chat', open), link.acquireLink('send', open)]);
    expect(open).toHaveBeenCalledTimes(1);
    expect(chat).toBe(fresh);
    expect(send).toBe(fresh);
    expect(dead.disconnect).toHaveBeenCalledTimes(1);

    await link.releaseLink('setup'); // the screen that held the dead link is gone too
    const [first, second] = order === 'chat leaves first' ? ['chat', 'send'] : ['send', 'chat'];
    await link.releaseLink(first);
    expect(fresh.disconnect).not.toHaveBeenCalled();
    expect(link.currentLink()).toBe(fresh);
    await link.releaseLink(second);
    expect(fresh.disconnect).toHaveBeenCalledTimes(1);
  });
});
