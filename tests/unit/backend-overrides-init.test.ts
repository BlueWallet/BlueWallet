/**
 * H19 · A saved node override is never bypassed by the default node, and a
 * failed read of the saved settings is retried instead of sticking.
 * Each test loads fresh modules: the overrides cache lives at module scope.
 */
type Prefs = typeof import('react-native-default-preference').default;

const TESTNET_OVERRIDE = 'wss://my-node.example:7443/ws';

function freshModules(get: (key: string) => Promise<string | null>) {
  let modules!: {
    overrides: typeof import('../../blue_modules/neurai/backendOverrides');
    depin: typeof import('../../blue_modules/neurai/depinRpcOverrides');
    hd: typeof import('../../class/wallets/neurai-hd-wallet');
  };
  jest.isolateModules(() => {
    const prefs: Prefs = require('react-native-default-preference');
    jest.spyOn(prefs, 'get').mockImplementation(get as never);
    modules = {
      overrides: require('../../blue_modules/neurai/backendOverrides'),
      depin: require('../../blue_modules/neurai/depinRpcOverrides'),
      hd: require('../../class/wallets/neurai-hd-wallet'),
    };
  });
  return modules;
}

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('H19 · node settings before the first connection', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds no backend until the saved override was read, then uses the override', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    const { overrides, hd } = freshModules(async key => {
      await gate; // the preference store answers late
      return key === 'NEURAI_WSS_TESTNET_URL' ? TESTNET_OVERRIDE : null;
    });
    const wallet = hd.NeuraiHDWallet.forNetwork('testnet', WORDS);

    expect(overrides.isOverridesLoaded()).toBe(false);
    expect(() => wallet.getBackend()).toThrow('still loading');
    expect(() => wallet.getBackend()).toThrow('still loading'); // a second early caller is refused too

    release();
    await overrides.loadOverrides();
    const backend = wallet.getBackend() as unknown as { url: string };
    expect(backend.url).toBe(TESTNET_OVERRIDE);
    expect(wallet.getBackend()).toBe(backend); // kept for the session
  });

  it('retries a failed read instead of keeping the rejection', async () => {
    let failures = 1;
    const { overrides, depin } = freshModules(async key => {
      if (failures > 0) {
        failures--;
        throw new Error('preferences unavailable');
      }
      return key === 'NEURAI_WSS_TESTNET_URL' ? TESTNET_OVERRIDE : null;
    });
    await expect(overrides.loadOverrides()).rejects.toThrow('preferences unavailable');
    expect(overrides.isOverridesLoaded()).toBe(false);

    await overrides.loadOverrides();
    expect(overrides.isOverridesLoaded()).toBe(true);
    expect(overrides.getWssUrlOverride('testnet')).toBe(TESTNET_OVERRIDE);

    await depin.loadDepinRpcOverrides();
    expect(depin.getDepinRpcConfig('testnet').url).toBe(TESTNET_OVERRIDE);
    expect(depin.isDepinRpcOverridesLoaded()).toBe(true);
  });

  it('keeps mainnet and testnet overrides apart', async () => {
    const { overrides } = freshModules(async key =>
      key === 'NEURAI_WSS_TESTNET_URL' ? TESTNET_OVERRIDE : key === 'NEURAI_WSS_MAINNET_URL' ? 'wss://main.example/ws' : null,
    );
    await overrides.loadOverrides();
    expect(overrides.getWssUrlOverride('testnet')).toBe(TESTNET_OVERRIDE);
    expect(overrides.getWssUrlOverride('mainnet')).toBe('wss://main.example/ws');
  });
});
