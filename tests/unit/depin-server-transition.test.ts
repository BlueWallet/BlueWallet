/**
 * Second review, item 7 · An update must not move DePIN to another server.
 *
 * Older versions let DePIN use plain `ws://` on any private or loopback host;
 * the current policy allows it only on 192.168.0.x and 192.168.1.x. A server
 * saved under the old rule stays saved and shown, and DePIN opens no
 * connection (to it or to the wallet's or public node) until the user changes
 * it. Each test loads fresh modules: the settings caches live at module scope.
 */
export {};

type Prefs = typeof import('react-native-default-preference').default;

const WALLET_OVERRIDE = 'wss://wallet.example/push';
const NETWORKS = ['mainnet', 'testnet'] as const;
const KEY = { mainnet: 'NEURAI_DEPIN_WSS_MAINNET', testnet: 'NEURAI_DEPIN_WSS_TESTNET' } as const;
const WALLET_KEY = { mainnet: 'NEURAI_WSS_MAINNET_URL', testnet: 'NEURAI_WSS_TESTNET_URL' } as const;

// Every host the old rule accepted without TLS and the current one refuses.
const RETIRED = [
  'ws://localhost:19020/push',
  'ws://127.0.0.1:19020',
  'ws://10.0.0.5:19020/push',
  'ws://172.20.1.2/push',
  'ws://172.31.255.1:19020/push',
  'ws://192.168.5.7:19020/push',
  'ws://depin-node.local/push',
];

/** Every WebSocket the code under test tries to open; each one then fails as an unreachable host would. */
const opened: string[] = [];
class RecordingWebSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data?: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(url: string) {
    opened.push(url);
    setTimeout(() => {
      this.readyState = 3;
      this.onerror?.('unreachable');
      this.onclose?.();
    }, 0);
  }

  send(): void {}
  close(): void {}
}

function freshModules(stored: Record<string, string>, gate?: Promise<void>) {
  let modules!: {
    prefs: Prefs;
    depin: typeof import('../../blue_modules/neurai/depinRpcOverrides');
    neurai: typeof import('../../blue_modules/neurai');
    revealed: typeof import('../../blue_modules/neurai/depinRevealed');
  };
  jest.isolateModules(() => {
    const prefs: Prefs = require('react-native-default-preference');
    jest.spyOn(prefs, 'get').mockImplementation((async (key: string) => {
      await gate;
      return stored[key] ?? null;
    }) as never);
    jest.spyOn(prefs, 'set').mockImplementation((async (key: string, value: string) => {
      stored[key] = value;
    }) as never);
    jest.spyOn(prefs, 'clear').mockImplementation((async (key: string) => {
      delete stored[key];
    }) as never);
    modules = {
      prefs,
      depin: require('../../blue_modules/neurai/depinRpcOverrides'),
      neurai: require('../../blue_modules/neurai'),
      revealed: require('../../blue_modules/neurai/depinRevealed'),
    };
  });
  return modules;
}

describe('second review · a DePIN server saved under the old LAN rule', () => {
  const realWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
  const realFetch = global.fetch;

  beforeEach(() => {
    opened.length = 0;
    (globalThis as { WebSocket?: unknown }).WebSocket = RecordingWebSocket;
    global.fetch = jest.fn(() => Promise.reject(new Error('HTTP forbidden')));
  });
  afterEach(() => {
    (globalThis as { WebSocket?: unknown }).WebSocket = realWebSocket;
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  describe.each(NETWORKS)('%s', network => {
    it.each(RETIRED)('%s: kept, shown, and nothing is sent anywhere before the user decides', async saved => {
      const stored: Record<string, string> = { [KEY[network]]: saved, [WALLET_KEY[network]]: WALLET_OVERRIDE };
      const { depin, neurai, revealed } = freshModules(stored);
      await depin.loadDepinRpcOverrides();

      // The user's choice is what the screens show, and it is still stored.
      expect(depin.getIncompatibleDepinServer(network)).toBe(saved);
      expect(depin.getDepinRpcConfig(network).url).toBe(saved);
      expect(depin.getDepinWssOverride(network)).toBeUndefined();
      expect(depin.getDepinSuspension(network)).toBe('incompatible');
      expect(stored[KEY[network]]).toBe(saved);

      // Every DePIN query is refused before it reaches a socket.
      const backend = neurai.getDepinRpcBackend(network);
      const refusals = [
        backend.rpc('getpubkey', ['address']),
        backend.rpc('depingetmsginfo', []),
        backend.getUtxos(['address']),
        backend.getMempool(['address']),
        backend.broadcast('00'),
        backend.getTipHeight(),
      ];
      for (const refusal of refusals) {
        await expect(refusal).rejects.toMatchObject({ name: 'DepinServerSuspendedError', reason: 'incompatible' });
      }
      expect(await backend.ping()).toBe(false);
      // A consumer that queries on its own (the wallet card's reveal badge).
      expect(await revealed.ensureRevealed('wallet-1', 'address', network)).toBe(false);

      expect(opened).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();

      // The same address cannot be saved again; the pause stays.
      await expect(depin.setDepinWssOverride(network, saved)).rejects.toThrow('wss://');
      expect(depin.getDepinSuspension(network)).toBe('incompatible');
      expect(stored[KEY[network]]).toBe(saved);
    });

    it('the user picks the wallet server: DePIN then uses it', async () => {
      const stored: Record<string, string> = { [KEY[network]]: 'ws://10.0.0.5:19020/push', [WALLET_KEY[network]]: WALLET_OVERRIDE };
      const { depin, neurai } = freshModules(stored);
      await depin.loadDepinRpcOverrides();

      await depin.setDepinWssOverride(network, null);
      expect(stored[KEY[network]]).toBeUndefined();
      expect(depin.getIncompatibleDepinServer(network)).toBeUndefined();
      expect(depin.getDepinSuspension(network)).toBeNull();
      expect(depin.getDepinRpcConfig(network).url).toBe(WALLET_OVERRIDE);
      expect((neurai.getDepinRpcBackend(network) as unknown as { url: string }).url).toBe(WALLET_OVERRIDE);
    });

    it('the user enters a wss:// address: DePIN then uses that one', async () => {
      const stored: Record<string, string> = { [KEY[network]]: 'ws://depin-node.local/push' };
      const { depin, neurai } = freshModules(stored);
      await depin.loadDepinRpcOverrides();

      await depin.setDepinWssOverride(network, 'wss://depin-node.example/push');
      expect(stored[KEY[network]]).toBe('wss://depin-node.example/push');
      expect(depin.getDepinSuspension(network)).toBeNull();
      expect((neurai.getDepinRpcBackend(network) as unknown as { url: string }).url).toBe('wss://depin-node.example/push');
    });
  });

  it('a server still allowed is used as before, and the other network is not paused', async () => {
    const stored: Record<string, string> = { [KEY.testnet]: 'ws://192.168.1.40:19020/push', [KEY.mainnet]: 'ws://10.0.0.5/push' };
    const { depin, neurai } = freshModules(stored);
    await depin.loadDepinRpcOverrides();

    expect(depin.getDepinSuspension('testnet')).toBeNull();
    expect((neurai.getDepinRpcBackend('testnet') as unknown as { url: string }).url).toBe('ws://192.168.1.40:19020/push');
    expect(depin.getDepinSuspension('mainnet')).toBe('incompatible');
  });

  it('nothing is sent while the saved settings are still being read', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    const { depin, neurai } = freshModules({ [KEY.testnet]: 'wss://depin-node.example/push' }, gate);

    expect(depin.getDepinSuspension('testnet')).toBe('not_loaded');
    await expect(neurai.getDepinRpcBackend('testnet').rpc('getpubkey', ['address'])).rejects.toMatchObject({ reason: 'not_loaded' });
    expect(opened).toEqual([]);

    release();
    await depin.loadDepinRpcOverrides();
    expect(depin.getDepinSuspension('testnet')).toBeNull();
    expect((neurai.getDepinRpcBackend('testnet') as unknown as { url: string }).url).toBe('wss://depin-node.example/push');
  });
});
