// Per-domain identity addresses.
//
// The promise these make is narrow and worth pinning: the same seed and the
// same domain always give the same address, two domains never share one, and
// the wallet remembers which ones it has used — those indexes are sparse, so a
// normal BIP44 scan would not find them again after a restore.

import {
  canonicalDomain,
  deriveDomainIdentity,
  recordDomainIdentity,
  supportsDomainIdentity,
  usedIdentities,
} from '../../blue_modules/neurai/connect/identity';
import type { AbstractNeuraiWallet } from '../../class/wallets/abstract-neurai-wallet';

const store = new Map<string, string>();
jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  default: {
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    get: jest.fn(async (k: string) => {
      if (!store.has(k)) throw Object.assign(new Error('not found'), { code: '404' }); // a missing key, as the real store reports it
      return store.get(k);
    }),
    remove: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
}));

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const wallet = (network: string): AbstractNeuraiWallet =>
  ({ network, secret: MNEMONIC, passphrase: '' }) as unknown as AbstractNeuraiWallet;

beforeEach(() => store.clear());

describe('domain identities', () => {
  it('are stable per domain and different between domains', async () => {
    const a = await deriveDomainIdentity(wallet('xna-test'), 'swap.neurai.org');
    const again = await deriveDomainIdentity(wallet('xna-test'), 'SWAP.neurai.org');
    const other = await deriveDomainIdentity(wallet('xna-test'), 'forum.neurai.org');
    expect(a?.address).toBeTruthy();
    expect(again?.address).toBe(a?.address); // canonicalised first
    expect(other?.address).not.toBe(a?.address);
    expect(a?.path).toBe(`m/44'/1'/101'/0/${a?.index}`);
    expect(a?.domain).toBe('swap.neurai.org');
  });

  it('differ between mainnet and testnet, as the coin type does', async () => {
    const test = await deriveDomainIdentity(wallet('xna-test'), 'example.com');
    const main = await deriveDomainIdentity(wallet('xna'), 'example.com');
    expect(test?.path).toBe(`m/44'/1'/101'/0/${test?.index}`);
    expect(main?.path).toBe(`m/44'/1900'/101'/0/${main?.index}`);
    expect(main?.address).not.toBe(test?.address);
  });

  it('are not recorded merely by deriving them', async () => {
    // Opening a login screen derives the identity to show it. If that recorded it,
    // rejecting the login — or picking the wallet address instead — would leave a
    // used identity behind that was never signed with.
    const before = (await usedIdentities()).length;
    await deriveDomainIdentity(wallet('xna-test'), 'never-signed-in.example');
    const after = await usedIdentities();
    expect(after).toHaveLength(before);
    expect(after.map(i => i.domain)).not.toContain('never-signed-in.example');
  });

  it('are recorded once signed with, for the backup and the login history', async () => {
    const swapIdentity = await deriveDomainIdentity(wallet('xna-test'), 'swap.neurai.org');
    const forumIdentity = await deriveDomainIdentity(wallet('xna-test'), 'forum.neurai.org');
    await recordDomainIdentity(swapIdentity!);
    await recordDomainIdentity(forumIdentity!);
    // The registry is a singleton with its own cache, so it may also hold what other
    // cases recorded: assert presence, not an exact list.
    const used = await usedIdentities();
    expect(used.map(i => i.domain)).toEqual(expect.arrayContaining(['forum.neurai.org', 'swap.neurai.org']));
    const swap = used.find(i => i.domain === 'swap.neurai.org');
    expect(swap?.address).toBe(swapIdentity?.address);
    expect(swap?.path).toBe(`m/44'/1'/101'/0/${swap?.index}`);
  });

  it('do not exist for post-quantum wallets, which have no BIP44 tree', async () => {
    expect(supportsDomainIdentity('xna-pq-test')).toBe(false);
    expect(await deriveDomainIdentity(wallet('xna-pq-test'), 'example.com')).toBeUndefined();
    // Nor for a wallet with no mnemonic (a hardware wallet).
    expect(
      await deriveDomainIdentity({ network: 'xna-test', secret: '' } as unknown as AbstractNeuraiWallet, 'example.com'),
    ).toBeUndefined();
  });

  it('canonicalises the domain before deriving', () => {
    expect(canonicalDomain('Example.COM')).toBe('example.com');
    expect(canonicalDomain('bücher.example')).toBe('xn--bcher-kva.example');
  });
});
