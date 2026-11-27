import { TESTNET_GENESIS_HASH } from '@neuraiproject/neurai-rpc';
import { RpcBackend } from '../../blue_modules/neurai/RpcBackend';
import { createDefaultBackend, getDepinRpcBackend } from '../../blue_modules/neurai';
import {
  getDepinRpcConfig,
  getDepinWssOverride,
  isAllowedDepinServerUrl,
  setDepinRpcConfig,
  setDepinWssOverride,
} from '../../blue_modules/neurai/depinRpcOverrides';
import { setWssUrlOverride } from '../../blue_modules/neurai/backendOverrides';
import { WssBackend } from '../../blue_modules/neurai/WssBackend';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';

const fetchBefore = global.fetch;
const socketBefore = global.WebSocket;
const mnemonic = 'result pact model attract result puzzle final boss private educate luggage era';

afterEach(() => {
  global.fetch = fetchBefore;
  global.WebSocket = socketBefore;
});

it('reads raw HTTP integers losslessly, including negative deltas and mempool', async () => {
  const replies: Record<string, string> = {
    getaddressbalance: '{"balance":10000000000000001,"received":10000000000000001}',
    getaddressutxos: '[{"satoshis":10000000000000001}]',
    getaddressdeltas: '[{"satoshis":-10000000000000001}]',
    getaddressmempool: '[{"satoshis":-9007199254740993}]',
  };
  global.fetch = jest.fn(async (_url, options) => {
    const method = JSON.parse(String(options?.body)).method;
    return new Response('{"result":' + replies[method] + ',"error":null,"id":1}', { status: 200 });
  });
  const backend = new RpcBackend({ chain: 'xna-test', url: 'http://127.0.0.1:19211' });
  expect(await backend.getBalance(['a'])).toBe(10000000000000001n);
  expect((await backend.getUtxos(['a']))[0].satoshis).toBe(10000000000000001n);
  expect((await backend.getAddressHistory(['a']))[0].satoshis).toBe(-10000000000000001n);
  expect((await backend.getMempool(['a']))[0].satoshis).toBe(-9007199254740993n);
});

it('routes every engine RPC call through the current selected backend', async () => {
  const w = NeuraiHDWallet.forNetwork('testnet', mnemonic);
  const first = new RpcBackend({ chain: 'xna-test', url: 'http://127.0.0.1:19211' });
  const second = new RpcBackend({ chain: 'xna-test', url: 'http://127.0.0.1:19212' });
  const a = jest.spyOn(first, 'rpc').mockResolvedValue([]);
  const b = jest.spyOn(second, 'rpc').mockResolvedValue([]);
  global.fetch = jest.fn(() => {
    throw new Error('Unexpected external request');
  });
  w.setBackend(first);
  const engine = await (w as any).ensureEngine();
  await engine.rpc('getaddressutxos', [{ addresses: ['a'] }, true]);
  expect(a).toHaveBeenCalledWith('getaddressutxos', [{ addresses: ['a'] }, true]);
  w.setBackend(second);
  await engine.rpc('getaddressmempool', [{ addresses: ['a'] }]);
  expect(b).toHaveBeenCalledWith('getaddressmempool', [{ addresses: ['a'] }]);
  expect(await engine.rpc('estimatesmartfee', [20])).toEqual({ feerate: '0.012' });
  expect(await w.estimateFeeRate()).toBe(0.012);
  expect(a).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
});

function service(version: 1 | 2, amount: string, confirmExact = true, network = 'testnet') {
  let failSubscription = false;
  let holdReads = false;
  const methods: string[] = [];
  const rawRequests: string[] = [];
  let socket: any;
  class FakeSocket {
    readyState = 0;
    onopen?: () => void;
    onmessage?: (event: { data: string }) => void;
    onclose?: () => void;
    constructor() {
      // Keep the transport instance so the test can deliver server pushes.
      // eslint-disable-next-line consistent-this
      socket = this;
      queueMicrotask(() => {
        this.readyState = 1;
        this.onopen?.();
      });
    }

    send(data: string) {
      rawRequests.push(data);
      const request = JSON.parse(data);
      methods.push(request.method + ':' + (request.params.protocol ?? ''));
      let result: unknown;
      let error: unknown;
      if (request.method === 'hello') {
        if (version === 1 && request.params.protocol === 'wss/2') error = { code: 1001, message: 'Unsupported protocol' };
        else
          result = {
            protocol: `wss/${version}`,
            exact_amounts: confirmExact,
            amounts: 'string-sats',
            wallet_rpc:
              version === 2
                ? { methods: ['getaddressutxos'], amounts: 'rpc-native-units', numeric_encoding: 'safe-number-or-string' }
                : undefined,
            ...(version === 2
              ? { service_id: 'test', network, genesis_hash: network === 'testnet' ? TESTNET_GENESIS_HASH : 'a'.repeat(64) }
              : {}),
          };
      } else if (request.method === 'ping') {
        result = 'pong';
      } else if (request.method === 'depin.msg_info') {
        result = { body: 'signed-body', poolsig: 'signature' };
      } else if (request.method === 'depin.receive_seq') {
        result = { encrypted: 'opaque', poolsig: 'signature', protocol: 6, request_hash: 'hash' };
      } else if (request.method === 'rpc.call') {
        result = [{ satoshis: amount, script: '51' }];
      } else if (request.method === 'tx.broadcast') {
        result = { txid: 'signed-tx' };
      } else if (request.method === 'address.get_state') {
        if (holdReads) return;
        result = {
          balance: { confirmed: amount, unconfirmed: '-1' },
          history: [{ txid: 'tx', height: 1, satoshis: '-' + amount }],
          utxos: [{ txid: 'tx', vout: 0, satoshis: amount }],
          mempool: [{ txid: 'pending', satoshis: '-1' }],
        };
      } else if (request.method === 'address.subscribe.bulk') {
        result = {
          results: request.params.addresses.map((address: string) =>
            failSubscription
              ? { address, error: { code: -1, message: 'Temporary failure' } }
              : { address, status: 'initial', balance: { confirmed: amount, unconfirmed: '-1' } },
          ),
        };
      }
      queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ id: request.id, result, error }) }));
    }

    close() {
      this.readyState = 3;
      queueMicrotask(() => this.onclose?.());
    }
  }
  global.WebSocket = FakeSocket as any;
  return {
    methods,
    rawRequests,
    socket: () => socket,
    holdReads: (hold: boolean) => {
      holdReads = hold;
    },
    failSubscription: (fail: boolean) => {
      failSubscription = fail;
    },
    push: (params: unknown) => socket.onmessage({ data: JSON.stringify({ method: 'address.changed', params }) }),
    sync: (stale: boolean) =>
      socket.onmessage({ data: JSON.stringify({ method: 'address.sync_status', params: { address: 'a', stale } }) }),
    close: () => socket?.close(),
  };
}

it('negotiates exact WSS amounts before concurrent requests and normalizes subscriptions and pushes', async () => {
  const server = service(2, '10000000000000001');
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  const listener = jest.fn();
  backend.onAddressChanged(listener);
  try {
    await backend.setSubscribedAddresses(['a']);
    expect(listener.mock.calls[0][0].balance).toEqual({ confirmed: 10000000000000001n, unconfirmed: -1n });
    const [balance, history, utxos, mempool] = await Promise.all([
      backend.getBalance(['a']),
      backend.getAddressHistory(['a']),
      backend.getUtxos(['a']),
      backend.getMempool(['a']),
    ]);
    expect(balance).toBe(10000000000000001n);
    expect(history[0].satoshis).toBe(-10000000000000001n);
    expect(utxos[0].satoshis).toBe(balance);
    expect(mempool[0].satoshis).toBe(-1n);
    server.push({ address: 'a', status: 'next', balance: { confirmed: '9007199254740993', unconfirmed: '-300000' } });
    expect(listener.mock.calls[1][0].balance).toEqual({ confirmed: 9007199254740993n, unconfirmed: -300000n });
  } finally {
    server.close();
  }
});

test.each([
  ['100000001', false],
  ['9007199254740993', true],
])('keeps v1 safe balances compatible and blocks unsafe balance %s', async (amount, fails) => {
  const server = service(1, amount);
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  try {
    const balance = backend.getBalance(['a']);
    if (fails) await expect(balance).rejects.toThrow('wss/2');
    else expect(await balance).toBe(BigInt(amount));
    expect(server.methods.slice(0, 2)).toEqual(['hello:wss/2', 'hello:wss/1']);
    await expect(backend.rpc('getaddressutxos', [])).rejects.toThrow('wss/2');
  } finally {
    server.close();
  }
});

it('rejects v2 without exactness capability', async () => {
  const server = service(2, '1', false);
  try {
    await expect(new WssBackend({ chain: 'xna-test', url: 'ws://local/push' }).getBalance(['a'])).rejects.toThrow('confirm exact');
  } finally {
    server.close();
  }
});

it('requests asset history and falls back to native history when an older index returns an empty wildcard', async () => {
  const paramsSeen: unknown[] = [];
  global.fetch = jest.fn(async (_url, options) => {
    const { params } = JSON.parse(String(options?.body));
    paramsSeen.push(params);
    const result = params[0].assetName === '*' ? '[]' : '[{"assetName":"XNA","satoshis":-10000000000000001}]';
    return new Response('{"result":' + result + ',"error":null,"id":1}', { status: 200 });
  });
  const backend = new RpcBackend({ chain: 'xna-test', url: 'http://127.0.0.1:19211' });
  expect((await backend.getAddressHistory(['a']))[0].satoshis).toBe(-10000000000000001n);
  expect(paramsSeen).toEqual([[{ addresses: ['a'], assetName: '*' }], [{ addresses: ['a'] }]]);
});

test('uses only the selected socket for builder queries and broadcast, including after reconnect', async () => {
  const server = service(2, '10000000000000001');
  global.fetch = jest.fn(() => {
    throw new Error('HTTP forbidden');
  });
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push', rpcUrl: 'https://obsolete/rpc' });
  try {
    expect(await backend.rpc('getaddressutxos', [])).toEqual([{ satoshis: '10000000000000001', script: '51' }]);
    expect(await backend.rpc('sendrawtransaction', ['signed-hex'])).toBe('signed-tx');
    server.close();
    await backend.rpc('getaddressutxos', []);
    expect(server.methods.filter(m => m === 'rpc.call:')).toHaveLength(2);
    expect(server.methods.filter(m => m === 'hello:wss/2')).toHaveLength(2);
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    server.close();
  }
});
test('unsupported WSS operations fail without an HTTP fallback', async () => {
  const server = service(2, '1');
  global.fetch = jest.fn(() => {
    throw new Error('HTTP forbidden');
  });
  try {
    const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
    await expect(backend.rpc('dumpprivkey', [])).rejects.toThrow('over WSS');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(server.methods).not.toContain('rpc.call:');
  } finally {
    server.close();
  }
});
it('reports stale and recovery at unchanged monetary status', async () => {
  const server = service(2, '1');
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  const changed = jest.fn();
  backend.onSyncStatus(changed);
  try {
    await backend.setSubscribedAddresses(['a']);
    expect(backend.getServiceStatus()).toBe('exact');
    server.sync(true);
    expect(backend.getServiceStatus()).toBe('stale');
    server.sync(false);
    expect(backend.getServiceStatus()).toBe('exact');
    server.close();
    expect(backend.getServiceStatus()).toBe('stale');
    expect(changed).toHaveBeenCalled();
  } finally {
    server.close();
  }
});

test.each(['mainnet', 'testnet'] as const)('default and custom %s wallet/DePIN backends use only the selected WSS', async network => {
  const server = service(2, '10000000000000001', true, network);
  global.fetch = jest.fn(() => {
    throw new Error('HTTP forbidden');
  });
  const defaultBackend = createDefaultBackend(network, 'legacy') as WssBackend;
  let custom: WssBackend | undefined;
  let chat: WssBackend | undefined;
  try {
    await setDepinRpcConfig(network, { url: 'https://obsolete.example/rpc' });
    await defaultBackend.rpc('getaddressutxos', []);
    expect(getDepinRpcConfig(network).url).toContain(network === 'mainnet' ? 'wallet-main-wss' : 'wallet-testnet-wss');
    await setWssUrlOverride(network, 'wss://custom.example/push');
    custom = createDefaultBackend(network, 'legacy') as WssBackend;
    chat = getDepinRpcBackend(network) as WssBackend;
    expect(getDepinRpcConfig(network).url).toBe('wss://custom.example/push');
    expect(await chat.rpc('depingetmsginfo', [])).toEqual({ body: 'signed-body', poolsig: 'signature' });
    await custom.rpc('getaddressutxos', []);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(server.methods).toContain('depin.msg_info:');
  } finally {
    defaultBackend.disconnect();
    custom?.disconnect();
    chat?.disconnect();
    await setWssUrlOverride(network, null);
    await setDepinRpcConfig(network, null);
    server.close();
  }
});

test.each(['mainnet', 'testnet'] as const)(
  'a %s WSS server for DePIN alone leaves the wallet on its own and refuses HTTP',
  async network => {
    const walletUrl = getDepinRpcConfig(network).url;
    try {
      await expect(setDepinWssOverride(network, 'http://192.168.1.222:19222/rpc')).rejects.toThrow('wss://');
      await expect(setDepinWssOverride(network, 'ws://depin.example.org/push')).rejects.toThrow('local network');
      expect(getDepinWssOverride(network)).toBeUndefined();

      await setDepinWssOverride(network, 'wss://depin.lan.example/push');
      expect(getDepinRpcConfig(network).url).toBe('wss://depin.lan.example/push');
      await setWssUrlOverride(network, 'wss://wallet.example/push');
      expect(getDepinRpcConfig(network).url).toBe('wss://depin.lan.example/push');

      await setDepinWssOverride(network, null);
      expect(getDepinRpcConfig(network).url).toBe('wss://wallet.example/push');
    } finally {
      await setDepinWssOverride(network, null);
      await setWssUrlOverride(network, null);
    }
    expect(getDepinRpcConfig(network).url).toBe(walletUrl);
  },
);

test.each([
  ['wss://depin.example.org/push', true],
  ['wss://203.0.113.7:443/push', true],
  // Without TLS, only 192.168.0.x and 192.168.1.x (owner decision, H28).
  ['ws://192.168.1.222:19020/push', true],
  ['ws://192.168.0.7:19020/push', true],
  ['ws://192.168.5.7:19020/push', false],
  ['ws://10.0.0.5:19020/push', false],
  ['ws://172.20.1.2/push', false],
  ['ws://localhost:19020/push', false],
  ['ws://127.0.0.1:19020', false],
  ['ws://depin-node.local/push', false],
  ['ws://depin.example.org/push', false],
  ['ws://203.0.113.7:19020/push', false],
  ['ws://172.32.0.1/push', false],
  ['http://192.168.1.222:19222/rpc', false],
  ['wss://', false],
])('DePIN server %s is allowed: %s (plain ws:// only on the local network)', (url, allowed) => {
  expect(isAllowedDepinServerUrl(url)).toBe(allowed);
});

it('retries failed subscriptions on re-entry, even when addresses and monetary status are unchanged', async () => {
  const server = service(2, '1');
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  try {
    backend.seedKnownStatuses({ a: 'initial' });
    server.failSubscription(true);
    await backend.setSubscribedAddresses(['a']);
    expect(backend.getServiceStatus()).toBe('stale');
    server.failSubscription(false);
    await backend.setSubscribedAddresses(['a']);
    expect(backend.getServiceStatus()).toBe('exact');
    expect(server.methods.filter(m => m === 'address.subscribe.bulk:')).toHaveLength(2);
    await backend.setSubscribedAddresses(['a']);
    expect(server.methods.filter(m => m === 'address.subscribe.bulk:')).toHaveLength(2);
  } finally {
    backend.disconnect();
  }
});

it('recovers a suspended OPEN socket on notification resume and ignores old-session failures/events', async () => {
  const server = service(2, '1');
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  const wallet = NeuraiHDWallet.forNetwork('testnet', mnemonic);
  (wallet as any)._addressStatus = { a: 'initial' };
  wallet.setBackend(backend);
  try {
    await wallet.ensureBackendConnected();
    const oldSocket = server.socket();
    expect(oldSocket.readyState).toBe(1);
    server.holdReads(true);
    const interrupted = backend.getBalance(['a']).catch(error => error);
    await Promise.resolve();
    await Promise.resolve();
    server.holdReads(false);
    await Promise.all([wallet.ensureBackendConnected({ reconnect: true }), wallet.ensureBackendConnected({ reconnect: true })]);
    expect(await interrupted).toBeInstanceOf(Error);
    expect(server.socket()).not.toBe(oldSocket);
    expect(backend.getServiceStatus()).toBe('exact');
    // A delayed background callback must not corrupt the resumed session.
    oldSocket.onmessage({ data: JSON.stringify({ method: 'address.sync_status', params: { address: 'a', stale: true } }) });
    expect(backend.getServiceStatus()).toBe('exact');
    expect(await backend.getBalance(['a'])).toBe(1n);
    expect(server.methods.filter(m => m === 'hello:wss/2')).toHaveLength(2);
    expect(server.methods.filter(m => m === 'address.subscribe.bulk:')).toHaveLength(2);
  } finally {
    backend.disconnect();
  }
});

it('can resume while an asynchronous connection handshake is still pending', async () => {
  service(2, '1');
  const backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  try {
    const interrupted = backend.ping();
    await backend.resumeConnection();
    expect(await interrupted).toBe(false);
    expect(await backend.ping()).toBe(true);
    expect(backend.getServiceStatus()).toBe('exact');
  } finally {
    backend.disconnect();
  }
});

test('DePIN sequence transport keeps the signed request and every cursor digit intact', async () => {
  const server = service(2, '1'),
    backend = new WssBackend({ chain: 'xna-test', url: 'ws://local/push' });
  try {
    const request = { protocol: 6, signature: 'signature', args: { cursor: { after_seq: 9007199254740993n } } };
    const result = await backend.rpc('depinreceiveseq', [request]);
    expect(result).toEqual({ encrypted: 'opaque', poolsig: 'signature', protocol: 6, request_hash: 'hash' });
    const raw = server.rawRequests.find(r => r.includes('depin.receive_seq'))!;
    expect(raw).toContain('9007199254740993');
    expect(raw).not.toContain('9007199254740992');
  } finally {
    backend.disconnect();
    server.close();
  }
});
