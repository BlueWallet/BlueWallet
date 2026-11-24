// The decisions the Neurai Connect approval screens make.
//
// The screens themselves are not rendered here — this repository has no
// renderer wired up for them — so everything worth pinning was pulled out into
// `screen/connect/logic.ts` and is exercised directly. What is pinned is what
// the protocol fixes and what a refactor could silently break:
//
//   * which address a login defaults to, including the case where the site's
//     preference cannot be honoured;
//   * when "Approve" must be unavailable, and why;
//   * what a `sendTransfer` shows before the wallet refuses it;
//   * that an unimplemented method is refused with 4200 and not with silence.

// `screen/connect/logic.ts` is deliberately free of React Native and of the
// relay client, so nothing native has to be mocked to reach it. The keychain is
// stubbed anyway because the module graph of a screen test is easy to widen by
// accident, and a test that silently starts touching the real secure store is a
// test that starts failing on CI for reasons that have nothing to do with it.
import {
  CONNECT_EMPTY_FIELD,
  connectedSites,
  addressFromCaip10,
  caip10Account,
  defaultAddressKind,
  describeError,
  formatMoment,
  isValidRelayUrl,
  loginApproval,
  methodHandling,
  CONNECT_XPUB_METHOD,
  connectMethodsFor,
  describePsbtCancellation,
  describePsbtOutput,
  normalizeAddressPolicy,
  pickChain,
  proposalNamespaces,
  relayHost,
  screenForIncoming,
  sessionApproval,
  sessionProperties,
  shorten,
  signMessageText,
  summariseSendTransfer,
  unsupportedMethodError,
  walletForSessionAddress,
  walletKnowsAddress,
} from '../../screen/connect/logic';

const keyStore = new Map<string, string>();
jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  default: {
    set: jest.fn(async (k: string, v: string) => {
      keyStore.set(k, v);
    }),
    get: jest.fn(async (k: string) => {
      if (!keyStore.has(k)) throw new Error('not found');
      return keyStore.get(k);
    }),
    remove: jest.fn(async (k: string) => {
      keyStore.delete(k);
    }),
  },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
}));

const MAINNET = 'bip122:00000044d33c0c0ba019be5c02497304';
const TESTNET = 'bip122:0000009697907b2aa409d4b1f10da0fa';

describe('addressPolicy', () => {
  it('treats anything that is not "wallet" as the identity default', () => {
    // spec/auth.md 2.1: absent means "identity", and an unknown value means absent.
    expect(normalizeAddressPolicy(undefined)).toBe('identity');
    expect(normalizeAddressPolicy('identity')).toBe('identity');
    expect(normalizeAddressPolicy('IDENTITY')).toBe('identity');
    expect(normalizeAddressPolicy('something-else')).toBe('identity');
    expect(normalizeAddressPolicy(null)).toBe('identity');
    expect(normalizeAddressPolicy('wallet')).toBe('wallet');
  });

  it('honours the site preference when an identity can be derived', () => {
    expect(defaultAddressKind(undefined, true)).toBe('identity');
    expect(defaultAddressKind('wallet', true)).toBe('wallet');
  });

  it('falls back to a wallet address when this wallet has no identities', () => {
    // Post-quantum and hardware wallets have no BIP44 account 101 to derive from.
    expect(defaultAddressKind(undefined, false)).toBe('wallet');
    expect(defaultAddressKind('identity', false)).toBe('wallet');
  });
});

describe('when a login may be approved', () => {
  const base = {
    hasWallet: true,
    addressKind: 'identity' as const,
    identityAvailable: true,
    address: 'NX7syqGJzweY57vW2K1D9G3kn8DXSq9Azc',
  };

  it('allows a fully resolved login', () => {
    expect(loginApproval(base)).toEqual({ canApprove: true });
  });

  it('refuses when there is no wallet of the requested network', () => {
    expect(loginApproval({ ...base, hasWallet: false })).toEqual({ canApprove: false, blocker: 'no_wallet' });
  });

  it('refuses a post-quantum wallet asked for an identity address, but not for a wallet one', () => {
    expect(loginApproval({ ...base, identityAvailable: false })).toEqual({ canApprove: false, blocker: 'no_identity' });
    expect(loginApproval({ ...base, identityAvailable: false, addressKind: 'wallet' })).toEqual({ canApprove: true });
  });

  it('refuses a request that lapsed while the screen was open', () => {
    expect(loginApproval({ ...base, expired: true })).toEqual({ canApprove: false, blocker: 'expired' });
  });

  it('refuses while the address is still being derived', () => {
    expect(loginApproval({ ...base, address: undefined })).toEqual({ canApprove: false, blocker: 'no_address' });
  });
});

describe('session proposals', () => {
  it('needs only a wallet with an address: signing is decided per request', () => {
    expect(sessionApproval({ hasWallet: true, address: 'NX7syqGJzweY57vW2K1D9G3kn8DXSq9Azc' })).toEqual({ canApprove: true });
    expect(sessionApproval({ hasWallet: false })).toEqual({ canApprove: false, blocker: 'no_wallet' });
    expect(sessionApproval({ hasWallet: true })).toEqual({ canApprove: false, blocker: 'no_address' });
  });

  it('grants exactly the methods and events asked for, on one chain, with one wallet account', () => {
    const namespaces = proposalNamespaces(
      { required: { methods: ['signMessage'], events: ['bip122_addressesChanged'] } },
      MAINNET,
      'NX7s',
      ['getAccountAddresses', 'signMessage'],
    );
    expect(namespaces).toEqual({
      bip122: {
        chains: [MAINNET],
        accounts: [`${MAINNET}:NX7s`],
        methods: ['signMessage'],
        events: ['bip122_addressesChanged'],
      },
    });
  });

  it('grants nothing when the proposal asked for nothing', () => {
    expect(proposalNamespaces(undefined, MAINNET, 'NX7s', ['signMessage']).bip122.methods).toEqual([]);
    expect(proposalNamespaces(undefined, MAINNET, 'NX7s', ['signMessage']).bip122.events).toEqual([]);
  });

  it('grants optional methods only when this wallet implements them', () => {
    const ask = {
      required: { methods: ['getAccountAddresses', 'signMessage'], events: ['bip122_addressesChanged'] },
      optional: { methods: ['signPsbt', CONNECT_XPUB_METHOD, 'sendTransfer'], events: [] },
    };
    const software = connectMethodsFor({ walletKind: 'ecdsa', isHardware: false });
    expect(proposalNamespaces(ask, TESTNET, 'tnq1r', software).bip122.methods).toEqual([
      'getAccountAddresses',
      'signMessage',
      'signPsbt',
      CONNECT_XPUB_METHOD,
    ]);
    const pq = connectMethodsFor({ walletKind: 'pq', isHardware: false });
    expect(proposalNamespaces(ask, TESTNET, 'tpq1z', pq).bip122.methods).toEqual(['getAccountAddresses', 'signMessage']);
  });

  it('serves a dApp that only sends optional namespaces (WalletConnect 2.21.8)', () => {
    const ask = { required: undefined, optional: { methods: ['signMessage', 'sendTransfer'], events: [] } };
    expect(proposalNamespaces(ask, MAINNET, 'NX7s', ['getAccountAddresses', 'signMessage']).bip122.methods).toEqual(['signMessage']);
  });

  it('hands the initial getAccountAddresses answer over as a JSON session property', () => {
    const props = sessionProperties([{ address: 'NX7s', path: "m/44'/1900'/0'/0/0" }]);
    expect(JSON.parse(props.bip122_getAccountAddresses)).toEqual([{ address: 'NX7s', path: "m/44'/1900'/0'/0/0" }]);
  });

  it('round-trips a CAIP-10 account', () => {
    expect(addressFromCaip10(caip10Account(TESTNET, 'tAbC'))).toBe('tAbC');
    expect(addressFromCaip10(undefined)).toBeUndefined();
    expect(addressFromCaip10('no-colons-here')).toBeUndefined();
  });
});

describe('picking the chain to answer on', () => {
  it('prefers a chain this wallet can serve', () => {
    expect(pickChain(['eip155:1', TESTNET], c => c.startsWith('bip122:'))).toBe(TESTNET);
  });

  it('falls back to the first chain so the screen can still explain itself', () => {
    expect(pickChain(['eip155:1'], c => c.startsWith('bip122:'))).toBe('eip155:1');
    expect(pickChain(undefined, () => true)).toBeUndefined();
    expect(pickChain([], () => true)).toBeUndefined();
  });
});

describe('session requests', () => {
  it('routes each method to the amount of friction it deserves', () => {
    expect(methodHandling('getAccountAddresses')).toBe('answer');
    expect(methodHandling('signMessage')).toBe('sign');
    expect(methodHandling('sendTransfer')).toBe('unsupported');
    expect(methodHandling('signPsbt')).toBe('unsupported');
    expect(methodHandling('neurai_somethingNew')).toBe('unsupported');
  });

  it('signs transactions and shares the account key only from Legacy and ECDSA software wallets', () => {
    for (const walletKind of ['legacy', 'ecdsa']) {
      const supported = connectMethodsFor({ walletKind, isHardware: false });
      expect(methodHandling('signPsbt', supported)).toBe('sign-psbt');
      expect(methodHandling(CONNECT_XPUB_METHOD, supported)).toBe('share-xpub');
    }
    for (const wallet of [
      { walletKind: 'pq', isHardware: false },
      { walletKind: 'legacy', isHardware: true },
    ]) {
      const supported = connectMethodsFor(wallet);
      expect(methodHandling('signPsbt', supported)).toBe('unsupported');
      expect(methodHandling(CONNECT_XPUB_METHOD, supported)).toBe('unsupported');
      expect(methodHandling('signMessage', supported)).toBe('sign');
    }
  });

  it('prints a PSBT output with its asset and destination', () => {
    const fmt = (sats: bigint) => (Number(sats) / 1e8).toFixed(8);
    expect(describePsbtOutput({ address: 'tAbC', scriptHex: '', sats: 150000000n, asset: null }, fmt)).toBe('1.50000000 XNA → tAbC');
    expect(describePsbtOutput({ address: 'tAbC', scriptHex: '', sats: 0n, asset: { name: 'MYASSET', amount: '2' } }, fmt)).toBe(
      '2 MYASSET → tAbC',
    );
    expect(describePsbtOutput({ address: null, scriptHex: '6a'.repeat(40), sats: 0n, asset: null }, fmt)).toMatch(
      /^0.00000000 XNA → script 6a/,
    );
  });

  // Like the Neurai wallets: `weOwnAddress` is false until the address engine has started;
  // `getAllExternalAddresses` answers from the addresses watched last time.
  const LEGACY = 't9Zo5RAwAucmz3tGuTFak6ZqpytiyxnLiJ';
  const ECDSA = 'tnq1r0c9zl485wv7wcfutxfyv8k2ltpfk5hdyp3s7g4chlphx8d2m6npqwxvjya';
  const started: string[] = [];
  const fakeWallet = (
    name: string,
    owns: string[],
    { walletKind = 'legacy', network = 'testnet', known = [] as string[], warm = false } = {},
  ) => {
    let up = warm;
    return {
      name,
      walletKind,
      getNeuraiNetwork: () => network,
      getAllExternalAddresses: () => (up ? owns : known),
      prewarmEngine: async () => {
        started.push(name);
        up = true;
      },
      weOwnAddress: (candidate: string) => up && owns.includes(candidate),
    };
  };

  it('finds the wallet of a session address, starting only the engines that can own it', async () => {
    started.length = 0;
    const wallets = [
      fakeWallet('pq', ['tpq1z…'], { walletKind: 'pq' }),
      fakeWallet('ecdsa', [ECDSA], { walletKind: 'ecdsa' }),
      fakeWallet('mainnet', [], { network: 'mainnet' }),
      fakeWallet('legacyOther', ['tOther']),
      fakeWallet('legacy', [LEGACY], { known: [LEGACY] }),
    ];
    expect((await walletForSessionAddress(wallets, LEGACY))?.name).toBe('legacy');
    // The legacy testnet wallet that watched the address last time is started first, and alone.
    expect(started).toEqual(['legacy']);

    started.length = 0;
    expect((await walletForSessionAddress(wallets, ECDSA))?.name).toBe('ecdsa');
    expect(started).toEqual(['ecdsa']);
    expect(await walletForSessionAddress(wallets, undefined)).toBeUndefined();
  });

  it('answers at once from a wallet already started, and survives a wallet that cannot start', async () => {
    started.length = 0;
    expect((await walletForSessionAddress([fakeWallet('warm', [LEGACY], { warm: true })], LEGACY))?.name).toBe('warm');
    expect(started).toEqual([]);
    const failing = { ...fakeWallet('failing', []), prewarmEngine: async () => Promise.reject(new Error('no mnemonic')) };
    expect((await walletForSessionAddress([failing, fakeWallet('legacy', [LEGACY])], LEGACY))?.name).toBe('legacy');
    expect(await walletForSessionAddress([fakeWallet('legacy', [LEGACY])], 'tNotAnAddress')).toBeUndefined();
  });

  it('knows a session address without starting the engine (session badge)', () => {
    const cold = fakeWallet('legacy', [LEGACY], { known: [LEGACY] });
    expect(cold.weOwnAddress(LEGACY)).toBe(false);
    expect(walletKnowsAddress(cold, LEGACY)).toBe(true);
    expect(walletKnowsAddress(fakeWallet('other', ['tOther'], { known: ['tOther'] }), LEGACY)).toBe(false);
    expect(walletKnowsAddress(fakeWallet('warm', [LEGACY], { warm: true }), LEGACY)).toBe(true);
  });

  it('prints what a cancelled order holds', () => {
    expect(describePsbtCancellation({ locked: { name: 'STAYTOKEN', amount: '7' } })).toBe('7 STAYTOKEN');
  });

  it('refuses the unimplemented methods with 4200 and the agreed wording', () => {
    expect(unsupportedMethodError('sendTransfer')).toEqual({ code: 4200, message: 'sendTransfer is not implemented yet' });
    expect(unsupportedMethodError('signPsbt')).toEqual({ code: 4200, message: 'signPsbt is not supported by this wallet' });
    expect(unsupportedMethodError('whatever')).toEqual({ code: 4200, message: 'whatever is not supported by this wallet' });
  });

  it('reads the message of a signMessage without trusting its shape', () => {
    expect(signMessageText({ message: 'hello' })).toBe('hello');
    expect(signMessageText({ message: 42 })).toBe('');
    expect(signMessageText(undefined)).toBe('');
    expect(signMessageText('hello')).toBe('');
  });
});

describe('what a sendTransfer shows', () => {
  it('shows destination, amount in XNA and memo', () => {
    expect(summariseSendTransfer({ recipientAddress: 'NX7s', amount: '12.5', memo: 'invoice 7' })).toEqual({
      destination: 'NX7s',
      amount: '12.5 XNA',
      memo: 'invoice 7',
    });
  });

  it('accepts the toAddress spelling and a numeric amount', () => {
    expect(summariseSendTransfer({ toAddress: 'tAbC', amount: 3 })).toEqual({
      destination: 'tAbC',
      amount: '3 XNA',
      memo: CONNECT_EMPTY_FIELD,
    });
  });

  it('names the asset when the transfer is not the base currency', () => {
    expect(summariseSendTransfer({ recipientAddress: 'NX7s', amount: '1', assetName: 'MYASSET' }).amount).toBe('1 MYASSET');
  });

  it('renders every missing field instead of hiding it', () => {
    // A transfer with nothing in it must look empty to the user, not tidy.
    expect(summariseSendTransfer({})).toEqual({
      destination: CONNECT_EMPTY_FIELD,
      amount: CONNECT_EMPTY_FIELD,
      memo: CONNECT_EMPTY_FIELD,
    });
    expect(summariseSendTransfer(undefined).destination).toBe(CONNECT_EMPTY_FIELD);
    expect(summariseSendTransfer({ amount: '' }).amount).toBe(CONNECT_EMPTY_FIELD);
  });
});

describe('routing an incoming item', () => {
  it('sends each kind to its own approval screen', () => {
    expect(screenForIncoming('auth')).toBe('ConnectLogin');
    expect(screenForIncoming('proposal')).toBe('ConnectProposal');
    expect(screenForIncoming('request')).toBe('ConnectRequest');
  });
});

describe('the relay field', () => {
  it('accepts only WebSocket URLs', () => {
    expect(isValidRelayUrl('wss://relay.neurai.org/v1')).toBe(true);
    expect(isValidRelayUrl('  ws://10.0.2.2:8080/v1  ')).toBe(true);
    expect(isValidRelayUrl('https://relay.neurai.org/v1')).toBe(false);
    expect(isValidRelayUrl('relay.neurai.org')).toBe(false);
    expect(isValidRelayUrl('wss://')).toBe(false);
    expect(isValidRelayUrl('')).toBe(false);
  });

  it('shows the host the wallet is talking to, and the raw value when there is none', () => {
    // The parser itself, and the case React Native's URL got wrong, are covered
    // in neurai-connect-relay-url.test.ts.
    expect(relayHost('wss://relay.neurai.org/v1')).toBe('relay.neurai.org');
  });
});

describe('formatting', () => {
  it('never prints an unreadable date as a date', () => {
    expect(formatMoment(undefined)).toBe(CONNECT_EMPTY_FIELD);
    expect(formatMoment('')).toBe(CONNECT_EMPTY_FIELD);
    expect(formatMoment('not-a-date')).toBe(CONNECT_EMPTY_FIELD);
    expect(formatMoment('2026-09-04T10:00:00Z')).not.toBe(CONNECT_EMPTY_FIELD);
    expect(formatMoment(1_788_000_000_000)).not.toBe(CONNECT_EMPTY_FIELD);
  });

  it('shortens only what is too long to read', () => {
    expect(shorten('NX7syq', 10)).toBe('NX7syq');
    expect(shorten('NX7syqGJzweY57vW2K1D9G3kn8DXSq9Azc', 6)).toBe('NX7syq…Sq9Azc');
  });

  it('always produces a message out of whatever was thrown', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('boom')).toBe('boom');
    expect(describeError(undefined)).toBe('undefined');
  });
});

describe('the connected sites list', () => {
  const meta = (url: string, name = 'Site') => ({ name, url, description: '', icons: [`${url}/icon.png`] });
  const session = (topic: string, url: string, lastActivity: number, expiry: number) =>
    ({ topic, pairingTopic: `p-${topic}`, peerMetadata: meta(url), lastActivity, expiry }) as any;

  it('shows a site once however many sessions it opened, with its latest activity and expiry', () => {
    const sites = connectedSites([session('a', 'https://dex.neurai.org', 5, 100), session('b', 'https://dex.neurai.org/x', 9, 80)]);
    expect(sites).toHaveLength(1);
    expect(sites[0].host).toBe('dex.neurai.org');
    expect(sites[0].sessionTopics).toEqual(['a', 'b']);
    expect(sites[0].lastActivity).toBe(9);
    expect(sites[0].expiry).toBe(100);
  });

  it('keeps different sites apart', () => {
    expect(connectedSites([session('a', 'https://one.example', 1, 1), session('b', 'https://two.example', 1, 1)])).toHaveLength(2);
  });

  it('keeps a site that sent no name, unnamed', () => {
    const sites = connectedSites([{ ...session('a', '', 1, 1), peerMetadata: { name: '', url: '', description: '', icons: [] } }]);
    expect(sites).toHaveLength(1);
    expect(sites[0].name).toBe('');
    expect(sites[0].host).toBe(CONNECT_EMPTY_FIELD);
  });
});
