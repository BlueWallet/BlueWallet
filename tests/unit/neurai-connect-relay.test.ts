// Changing the relay the wallet talks to.
//
// A session is a topic on one relay and nowhere else. If the wallet moves while
// one is open, it resubscribes on the new server — where the site is not
// listening — and revoking it later publishes `session_delete` into the void,
// leaving the site convinced the user is still logged in. So the move is refused
// while anything is still there, and the scanner and Settings share that rule.
//
// "Anything" is every pairing, not only the ones still waiting for an answer:
// approving a login marks its pairing active and may leave no session at all,
// and the SDK resubscribes to every pairing it holds after a restart.

import {
  changeRelay,
  connectPairings,
  connectSessions,
  onConnectSessionsChanged,
  pairWithUri,
  RelayInUseError,
  relayInUse,
  relayUsage,
  revokeAllSessions,
  revokeSession,
  startConnect,
} from '../../blue_modules/neurai/connect/client';
import { DEFAULT_RELAY_URL, getRelayUrl, getRelayUrlOverride } from '../../blue_modules/neurai/connect/config';

const SESSION_TOPIC = 'a'.repeat(64);
const PAIRING_TOPIC = 'b'.repeat(64);
const OTHER_RELAY = 'ws://10.0.2.2:8787/v1';

let sessions: { topic: string }[] = [];
let pairings: { topic: string; active: boolean }[] = [];

const fakeWallet = {
  on: () => fakeWallet,
  sessions: () => sessions,
  pairingList: () => pairings,
  pendingPairings: () => pairings.filter(p => !p.active),
  pair: jest.fn(async () => ({ topic: PAIRING_TOPIC })),
  disconnectAll: jest.fn(async () => {
    sessions = [];
  }),
  forgetPairings: jest.fn(async () => {
    const count = pairings.length;
    pairings = [];
    return count;
  }),
  disconnect: jest.fn(async () => {}),
  close: jest.fn(async () => {}),
  resume: jest.fn(async () => {}),
};

let initFails: string | null = null;

jest.mock('@neuraiproject/neurai-connect-wallet', () => ({
  __esModule: true,
  NeuraiConnectWallet: {
    init: jest.fn(async () => {
      if (initFails) throw new Error(initFails);
      return fakeWallet;
    }),
  },
  SESSIONS_STORAGE_KEY: 'connect:sessions',
  PAIRINGS_STORAGE_KEY: 'connect:pairings',
}));
jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  default: {
    set: jest.fn(async () => {}),
    get: jest.fn(async () => {
      // A missing key, as react-native-secure-key-store reports it.
      throw Object.assign(new Error('empty'), { code: '404' });
    }),
    remove: jest.fn(async () => {}),
  },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
}));
jest.mock('react-native-default-preference', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setName: jest.fn(async () => {}),
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      clear: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

beforeEach(async () => {
  initFails = null;
  sessions = [];
  pairings = [];
  await startConnect();
  await changeRelay(null); // back to the default before each case
});

describe('what is tied to the relay in use', () => {
  it('counts sessions and scans still waiting for an answer', () => {
    expect(relayUsage()).toEqual({ sessions: 0, pairings: 0 });
    expect(relayInUse()).toBe(false);

    sessions = [{ topic: SESSION_TOPIC }];
    pairings = [{ topic: PAIRING_TOPIC, active: false }];
    expect(relayUsage()).toEqual({ sessions: 1, pairings: 1 });
    expect(relayInUse()).toBe(true);
    expect(connectSessions()).toHaveLength(1);
    expect(connectPairings()).toHaveLength(1);
  });

  it('counts a pairing a login already used, which is no longer "pending"', () => {
    pairings = [{ topic: PAIRING_TOPIC, active: true }];
    expect(relayUsage()).toEqual({ sessions: 0, pairings: 1 });
    expect(relayInUse()).toBe(true);
  });
});

describe('changeRelay', () => {
  it('moves the wallet when nothing is left behind', async () => {
    await changeRelay(OTHER_RELAY);
    expect(getRelayUrl()).toBe(OTHER_RELAY);
    expect(getRelayUrlOverride()).toBe(OTHER_RELAY);
  });

  it('takes the default typed in again as the default, not as a custom relay', async () => {
    await changeRelay(OTHER_RELAY);
    await changeRelay(`${DEFAULT_RELAY_URL}/`);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
    expect(getRelayUrlOverride()).toBeUndefined();
  });

  it('restores the default relay', async () => {
    await changeRelay(OTHER_RELAY);
    await changeRelay(null);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
    expect(getRelayUrlOverride()).toBeUndefined();
  });

  it('refuses while a session is open, and changes nothing', async () => {
    sessions = [{ topic: SESSION_TOPIC }];

    await expect(changeRelay(OTHER_RELAY)).rejects.toBeInstanceOf(RelayInUseError);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL); // the setting was not written
    expect(getRelayUrlOverride()).toBeUndefined();
  });

  it('refuses while a scan is still waiting for an answer', async () => {
    pairings = [{ topic: PAIRING_TOPIC, active: false }];

    const error = await changeRelay(OTHER_RELAY).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RelayInUseError);
    expect((error as RelayInUseError).usage).toEqual({ sessions: 0, pairings: 1 });
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
  });

  it('refuses to go back to the default too: the direction is not what matters', async () => {
    await changeRelay(OTHER_RELAY);
    sessions = [{ topic: SESSION_TOPIC }];

    await expect(changeRelay(null)).rejects.toBeInstanceOf(RelayInUseError);
    expect(getRelayUrl()).toBe(OTHER_RELAY);
  });

  it('lets the move through once the user has logged out everywhere', async () => {
    sessions = [{ topic: SESSION_TOPIC }];
    pairings = [{ topic: PAIRING_TOPIC, active: false }];

    // Every topic that stops existing is announced, so its push registration goes too.
    const ended: string[] = [];
    const off = onConnectSessionsChanged(change => {
      if (change.reason === 'deleted' && change.topic) ended.push(change.topic);
    });
    await revokeAllSessions();
    off();

    expect(ended).toEqual([SESSION_TOPIC, PAIRING_TOPIC]);
    expect(relayInUse()).toBe(false);
    await changeRelay(OTHER_RELAY);
    expect(getRelayUrl()).toBe(OTHER_RELAY);
  });
});

describe('the login-then-revoke cycle', () => {
  // The case the "pending pairings" rule missed: a site logs the user in over a
  // pairing, which the SDK marks active. Revoking the session leaves that pairing
  // behind, and the wallet will subscribe to its topic again on the next start.
  it('still refuses to move after the only session of an approved login is revoked', async () => {
    sessions = [{ topic: SESSION_TOPIC }];
    pairings = [{ topic: PAIRING_TOPIC, active: true }];

    await revokeSession(SESSION_TOPIC);
    sessions = []; // what the SDK does; the pairing is untouched
    expect(relayUsage()).toEqual({ sessions: 0, pairings: 1 });

    await expect(changeRelay(OTHER_RELAY)).rejects.toBeInstanceOf(RelayInUseError);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
    expect(getRelayUrlOverride()).toBeUndefined(); // the setting was not written

    // "Log out everywhere" is the way out, and it is offered because a pairing
    // counts as a connection even with the session list empty.
    await revokeAllSessions();
    expect(fakeWallet.forgetPairings).toHaveBeenCalled();
    expect(relayInUse()).toBe(false);
    await changeRelay(OTHER_RELAY);
    expect(getRelayUrl()).toBe(OTHER_RELAY);
  });
});

describe('when the current relay does not answer', () => {
  // The trap this avoids: Android refuses cleartext to the stored relay, so the
  // client cannot start — and if changing the setting required a live client,
  // the only way out of a bad relay URL would be reinstalling the app.
  it('still saves the new relay when the client cannot start', async () => {
    initFails = 'CLEARTEXT communication to 127.0.0.1 not permitted by network security policy';

    await changeRelay(OTHER_RELAY);
    expect(getRelayUrlOverride()).toBe(OTHER_RELAY);
  });

  it('saves it even when the new relay does not answer either', async () => {
    initFails = 'connection refused';

    await changeRelay(OTHER_RELAY); // resolves: the choice is stored, the failure is reported when pairing
    expect(getRelayUrl()).toBe(OTHER_RELAY);
  });
});

describe('a code for another relay', () => {
  const uriFor = (relay: string) => `nc:${'1'.repeat(64)}@1?relay=${encodeURIComponent(relay)}&symKey=${'2'.repeat(64)}`;

  it('is refused while the wallet still has connections on the current one', async () => {
    sessions = [{ topic: SESSION_TOPIC }];

    await expect(pairWithUri(uriFor(OTHER_RELAY))).rejects.toThrow(/still has connections/);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
    expect(fakeWallet.pair).not.toHaveBeenCalled();
  });

  it('is refused for a pending scan as well, not only for sessions', async () => {
    pairings = [{ topic: PAIRING_TOPIC, active: false }];

    await expect(pairWithUri(uriFor(OTHER_RELAY))).rejects.toThrow(/still has connections/);
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
  });

  it('goes back to the default, not to a custom copy of it, when a code brings the default relay', async () => {
    await changeRelay(OTHER_RELAY);
    await pairWithUri(uriFor(DEFAULT_RELAY_URL));
    expect(getRelayUrl()).toBe(DEFAULT_RELAY_URL);
    expect(getRelayUrlOverride()).toBeUndefined();
  });

  it('moves the wallet to the relay in the code when nothing is in the way', async () => {
    fakeWallet.pair.mockClear();

    await pairWithUri(uriFor(OTHER_RELAY));
    expect(getRelayUrl()).toBe(OTHER_RELAY);
    expect(fakeWallet.pair).toHaveBeenCalledTimes(1);
  });
});
