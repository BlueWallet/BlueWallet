// Pinning the DePIN pool key.
//
// The key that verifies a `poolsig` travels inside the very body being
// verified, so verification alone proves self-consistency, not identity. These
// tests pin the behaviour that makes it mean something: remember the key seen
// first, and refuse a later change instead of adopting it.
//
// What this deliberately does NOT claim: that the first contact is safe. That
// is why `firstContact` and `fingerprint` are surfaced — see the plan's §4.1.1.

import { DepinPoolPinMismatchError, forgetPin, getVerifiedPool, poolFingerprint } from '../../blue_modules/neurai/depinPool';

const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => storage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      storage.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      storage.delete(k);
    }),
  },
}));

const getDepinPoolInfo = jest.fn();
const poolKeyFingerprint = jest.fn((key: string) => `fp(${key.slice(0, 4)})`);
jest.mock('../../blue_modules/neurai/depinMsg', () => ({
  __esModule: true,
  getDepinPoolInfo: (...args: unknown[]) => getDepinPoolInfo(...args),
  poolKeyFingerprint: (key: string) => poolKeyFingerprint(key),
}));

const KEY_A = '02' + 'a'.repeat(64);
const KEY_B = '02' + 'b'.repeat(64);
const URL = 'https://rpc-testnet-depin.neurai.org/rpc';

const replyWith = (poolPublicKey: string) => ({
  info: { enabled: true, token: '&DEPINTESTING', protocol: 6, depinpoolpkey: poolPublicKey },
  pin: { serviceId: `xna-test|${URL}`, poolRoot: '&DEPINTESTING', poolPublicKey },
  trust: 'tofu',
  fingerprint: poolPublicKey,
});

const call = jest.fn();

beforeEach(async () => {
  storage.clear();
  getDepinPoolInfo.mockReset();
  await forgetPin(`xna-test|${URL}`);
});

describe('getVerifiedPool', () => {
  it('pins the key seen on first contact and says it was first', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    const first = await getVerifiedPool({ call, network: 'xna-test', url: URL });

    expect(first.firstContact).toBe(true);
    expect(first.fingerprint).toBe(poolFingerprint(KEY_A));
    expect(getDepinPoolInfo.mock.calls[0][0].trust).toEqual({ mode: 'tofu' });
  });

  it('a background observation leaves first-contact pinning to the interactive client', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    await getVerifiedPool({ call, network: 'xna-test', url: URL, persistPin: false });
    expect(storage.size).toBe(0);
    expect((await getVerifiedPool({ call, network: 'xna-test', url: URL })).firstContact).toBe(true);
  });

  it('uses the stored pin on later contacts, not TOFU again', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    await getVerifiedPool({ call, network: 'xna-test', url: URL });
    const second = await getVerifiedPool({ call, network: 'xna-test', url: URL });

    expect(second.firstContact).toBe(false);
    expect(getDepinPoolInfo.mock.calls[1][0].trust.mode).toBe('pinned');
  });

  it('REFUSES a changed key instead of adopting it', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    await getVerifiedPool({ call, network: 'xna-test', url: URL });

    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_B));
    await expect(getVerifiedPool({ call, network: 'xna-test', url: URL })).rejects.toBeInstanceOf(DepinPoolPinMismatchError);
  });

  it('the refusal carries both fingerprints so they can be compared', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    await getVerifiedPool({ call, network: 'xna-test', url: URL });
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_B));

    await expect(getVerifiedPool({ call, network: 'xna-test', url: URL })).rejects.toMatchObject({
      expectedFingerprint: poolFingerprint(KEY_A),
      seenFingerprint: poolFingerprint(KEY_B),
    });
  });

  it('a pin never crosses networks', async () => {
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_A));
    await getVerifiedPool({ call, network: 'xna-test', url: URL });

    // Mainnet is a different serviceId, so this is a first contact of its own,
    // not an inherited trust.
    getDepinPoolInfo.mockResolvedValue(replyWith(KEY_B));
    const mainnet = await getVerifiedPool({ call, network: 'xna', url: URL });
    expect(mainnet.firstContact).toBe(true);
  });

  it('a library rejection is not swallowed', async () => {
    // An invalid poolsig or malformed body must reach the caller: nothing may
    // update UI or state on an unverified answer.
    getDepinPoolInfo.mockRejectedValue(new Error('poolsig verification failed'));
    await expect(getVerifiedPool({ call, network: 'xna-test', url: URL })).rejects.toThrow(/poolsig/);
  });
});

describe('poolFingerprint', () => {
  it('uses the library digest, so it matches what other clients show', () => {
    // The point of a fingerprint is being read out and compared against
    // another tool. A local abbreviation of our own would not compare.
    expect(poolFingerprint(KEY_A)).toBe('fp(02aa)');
    expect(poolKeyFingerprint).toHaveBeenCalledWith(KEY_A);
  });

  it('differs for different keys', () => {
    expect(poolFingerprint(KEY_A)).not.toBe(poolFingerprint(KEY_B));
  });

  it('still shows something for a key it cannot digest', () => {
    // Reached with the unknown counterpart of a pin mismatch: showing nothing
    // would hide the very difference the user is being asked to judge.
    poolKeyFingerprint.mockImplementationOnce(() => {
      throw new Error('not a public key');
    });
    expect(poolFingerprint(KEY_A)).toBe(`${KEY_A.slice(0, 8)}…${KEY_A.slice(-8)}`);
  });

  it('passes an empty key straight through', () => {
    expect(poolFingerprint('')).toBe('');
  });
});
