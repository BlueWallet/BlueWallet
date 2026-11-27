// The bridge between the Neurai Connect SDK and the wallet's screens.
//
// The SDK delivers requests as events, but an approval screen is opened later
// and by id, so the bridge has to queue them and hand each one over exactly
// once. These tests pin that, and the "sessions changed" signal push
// registration hangs off — both are easy to break and invisible until a user
// scans a code and nothing opens.

import type { AuthRequestEvent, SessionRequestEvent } from '@neuraiproject/neurai-connect-wallet';

import { addressFromCaip10 } from '../../screen/connect/logic';

import {
  concludeLogin,
  connectPairings,
  connectSessions,
  onConnectIncoming,
  onConnectNotice,
  onConnectSessionsChanged,
  pairingsRetired,
  peekIncoming,
  pendingIncoming,
  startConnect,
  takeIncoming,
} from '../../blue_modules/neurai/connect/client';
import { connectHistory } from '../../blue_modules/neurai/connect/history';

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler[]>();
// What the SDK holds at start: a login it kept "active" for good, the pairing a
// live session came through, and a code scanned a minute ago and not answered.
let fakePairings: { topic: string; active: boolean; expiry: number; peerMetadata?: object }[] = [
  { topic: 'login-old', active: true, expiry: 1_800_000_300, peerMetadata: { name: 'Dex', url: 'https://dex.example/app', icons: [] } },
  { topic: 'session-pairing', active: true, expiry: 1_800_000_300, peerMetadata: { name: 'Shop', url: 'https://shop.example' } },
  { topic: 'scan-pending', active: false, expiry: Math.floor(Date.now() / 1000) + 240 },
];
const fakeWallet = {
  on: (event: string, handler: Handler) => {
    handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    return fakeWallet;
  },
  sessions: () => [{ topic: 'a'.repeat(64), pairingTopic: 'session-pairing' }],
  pairingList: () => fakePairings,
  forgetPairing: jest.fn(async (topic: string) => {
    fakePairings = fakePairings.filter(pairing => pairing.topic !== topic);
    return true;
  }),
  close: jest.fn(async () => {}),
  resume: jest.fn(async () => {}),
};

jest.mock('@neuraiproject/neurai-connect-wallet', () => ({
  __esModule: true,
  NeuraiConnectWallet: { init: jest.fn(async () => fakeWallet) },
}));
jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  default: {
    set: jest.fn(async () => {}),
    get: jest.fn(async () => {
      throw Object.assign(new Error('empty'), { code: '404' }); // a missing key, as the real store reports it
    }),
    remove: jest.fn(async () => {}),
  },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
}));
jest.mock('react-native-default-preference', () => ({
  __esModule: true,
  default: {
    setName: jest.fn(async () => {}),
    get: jest.fn(async () => null),
    set: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));

const fire = (event: string, payload: unknown) => (handlers.get(event) ?? []).forEach(h => h(payload));
const authEvent = (id: number) =>
  ({
    id,
    pairingTopic: 'p'.repeat(64),
    requester: { publicKey: 'k', metadata: { name: 'Site', url: 'https://example.com' } },
    payload: { domain: 'example.com' },
    verify: { domainMatchesMetadata: true, expired: false },
  }) as unknown as AuthRequestEvent;

beforeAll(async () => {
  await startConnect();
});

describe('incoming approvals', () => {
  it('queues an auth request and hands it over exactly once', () => {
    const seen: unknown[] = [];
    const off = onConnectIncoming(item => seen.push(item));
    fire('auth_request', authEvent(1));

    expect(seen).toHaveLength(1);
    expect(peekIncoming(1)).toMatchObject({ kind: 'auth', id: 1 });
    expect(peekIncoming(1)).toBeDefined(); // peeking does not consume
    expect(takeIncoming(1)).toMatchObject({ kind: 'auth' });
    expect(takeIncoming(1)).toBeUndefined(); // a screen cannot answer the same request twice
    off();
  });

  it('keeps several waiting, oldest first, and stops notifying after unsubscribe', () => {
    const seen: unknown[] = [];
    const off = onConnectIncoming(item => seen.push(item));
    fire('auth_request', authEvent(2));
    fire('session_request', {
      id: 3,
      topic: 't'.repeat(64),
      chainId: 'bip122:x',
      method: 'signMessage',
      params: {},
      session: {},
    } as unknown as SessionRequestEvent);
    expect(pendingIncoming().map(i => i.id)).toEqual([2, 3]);
    expect(pendingIncoming().map(i => i.kind)).toEqual(['auth', 'request']);

    off();
    fire('auth_request', authEvent(4));
    expect(seen.map((i: any) => i.id)).toEqual([2, 3]); // 4 was queued but not announced to us
    expect(peekIncoming(4)).toBeDefined();
    takeIncoming(2);
    takeIncoming(3);
    takeIncoming(4);
  });

  it('a listener that throws does not stop the others', () => {
    const seen: unknown[] = [];
    const offBad = onConnectIncoming(() => {
      throw new Error('boom');
    });
    const offGood = onConnectIncoming(item => seen.push(item));
    expect(() => fire('auth_request', authEvent(5))).not.toThrow();
    expect(seen).toHaveLength(1);
    offBad();
    offGood();
    takeIncoming(5);
  });
});

describe('notices and session changes', () => {
  it('reports what the SDK refused on our behalf', () => {
    const notices: unknown[] = [];
    const off = onConnectNotice(n => notices.push(n));
    fire('auth_rejected', { reason: 'the login request expired' });
    fire('request_blocked', { inspection: { reason: 'sign-in message for bank.example' } });
    expect(notices).toEqual([
      { kind: 'auth_rejected', message: 'the login request expired' },
      { kind: 'request_blocked', message: 'sign-in message for bank.example' },
    ]);
    off();
  });

  it('signals when the live sessions may have changed, carrying the topic that ended', () => {
    // Push registration follows this: a revoked session must stop waking the phone,
    // and the relay only removes a registration for the topic it is told about.
    const changes: { reason: string; topic?: string }[] = [];
    const off = onConnectSessionsChanged(change => changes.push(change));
    fire('session_settled', { session: { topic: 'a'.repeat(64) } });
    fire('session_delete', { topic: 'b'.repeat(64) });
    expect(changes).toEqual([
      { reason: 'settled', topic: 'a'.repeat(64) },
      { reason: 'deleted', topic: 'b'.repeat(64) },
    ]);
    off();
  });

  it('exposes the sessions the SDK holds', () => {
    expect(connectSessions()).toHaveLength(1);
  });
});

describe('the wallet a session belongs to', () => {
  // The card badge asks "does this wallet answer any live session", and the answer
  // is the CAIP-10 account a session settled with — always a wallet address.
  it('reads the address out of the account the session settled with', () => {
    const account = `bip122:0000009697907b2aa409d4b1f10da0fa:t9Zo5RAwAucmz3tGuTFak6ZqpytiyxnLiJ`;
    expect(addressFromCaip10(account)).toBe('t9Zo5RAwAucmz3tGuTFak6ZqpytiyxnLiJ');
    expect(addressFromCaip10(undefined)).toBeUndefined();
    expect(addressFromCaip10('not-an-account')).toBeUndefined();
  });
});

describe('pairings a login left behind', () => {
  it('are written to the history and forgotten after start, in the background, and nothing else is', async () => {
    await pairingsRetired();
    expect(fakeWallet.forgetPairing).toHaveBeenCalledWith('login-old');
    expect(connectPairings().map(pairing => pairing.topic)).toEqual(['session-pairing', 'scan-pending']);
    const entry = (await connectHistory()).find(e => e.pairingTopic === 'login-old');
    expect(entry).toMatchObject({ kind: 'login', name: 'Dex', url: 'https://dex.example/app', approximate: true });
    // Rebuilt from the scan: the expiry minus the pairing TTL of 300 s.
    expect(entry?.at).toBe((1_800_000_300 - 300) * 1000);
  });

  it('an approved login is recorded with its address and its pairing dropped at once', async () => {
    await concludeLogin(authEvent(9), 'NXaddress');
    expect(fakeWallet.forgetPairing).toHaveBeenCalledWith('p'.repeat(64));
    const entry = (await connectHistory()).find(e => e.pairingTopic === 'p'.repeat(64));
    expect(entry).toMatchObject({ kind: 'login', name: 'Site', url: 'https://example.com', address: 'NXaddress' });
    expect(entry?.approximate).toBeUndefined();
  });
});
