import assert from 'assert';

import { DelegateVtxo, networks } from '@arkade-os/sdk';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';
import { hexToUint8Array } from '../../blue_modules/uint8array-extras';
import { resetArkadeTestState } from '../helpers/arkadeMocks';
import { FAKE_ASP_INFO, FAKE_DELEGATE_PUBKEY, installSdkProviderSpies, restoreSdkProviderSpies } from '../helpers/sdkProviderMocks';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Locked delegate-flavored Ark address for TEST_MNEMONIC against the canned
// FAKE_ASP_INFO (mainnet signerPubkey, unilateralExitDelay = 605184) and the
// canned FAKE_DELEGATE_PUBKEY (secp256k1 generator G in compressed form).
//
// What this pins:
//   - LightningArkWallet's BIP86 derivation path (m/86'/0'/0'/0/0).
//   - Wallet.secret -> identity wiring (the `arkade://` strip).
//   - The choice of DelegateVtxo (vs DefaultVtxo) when delegator is configured.
//   - The csvTimelock format (seconds) and value derived from
//     ASP `unilateralExitDelay`.
//   - The Arkade address encoding (mainnet `ark` HRP, server-pubkey carrier).
//
// What this does NOT pin: the production ASP/delegator state. The test runs
// against canned inputs; Wallet.create's runtime trust path is exercised by
// the regression suite at integration time.
//
// Any change to identity path, delegate enable/disable, or DelegateVtxo.Script
// construction must break this assertion. To regenerate after a deliberate
// change: replace EXPECTED with `'__CAPTURE_ME__'`, run the test, copy the
// printed address, paste it here, lock again.
const EXPECTED_ARK_ADDRESS =
  'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t47e8x64mwqpvyvaxefy4ennzfu3qxrnarqx9l3x4rspjavwj04af6kepxv';
const EXPECTED_NAMESPACE = 'e13b00f781e8dfc57f8f2a936220ff24d132eaaf8c85d4b10b5337645085ee9a';

beforeEach(() => {
  resetArkadeTestState();
});

describe('LightningArkWallet derivation regression', () => {
  it('derives the locked delegate-flavored Ark address for the test mnemonic', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    // Faithfully replicates the SDK's setupWalletConfig recipe:
    //   serverPubKey  = hex.decode(info.signerPubkey).slice(1)
    //   delegatePubKey = hex.decode(delegateInfo.pubkey).slice(1)
    //   csvTimelock = delayToTimelock(info.unilateralExitDelay)
    //   offchainTapscript = new DelegateVtxo.Script({pubKey, serverPubKey, delegatePubKey, csvTimelock})
    //   arkAddress = offchainTapscript.address(network.hrp, serverPubKey).encode()
    const identity = w._getIdentity();
    const userPubKey = await identity.xOnlyPublicKey();
    const serverPubKey = hexToUint8Array(FAKE_ASP_INFO.signerPubkey).slice(1);
    const delegatePubKey = hexToUint8Array(FAKE_DELEGATE_PUBKEY).slice(1);

    const offchainTapscript = new DelegateVtxo.Script({
      pubKey: userPubKey,
      serverPubKey,
      delegatePubKey,
      csvTimelock: { value: BigInt(FAKE_ASP_INFO.unilateralExitDelay), type: 'seconds' },
    });

    const address = offchainTapscript.address(networks.bitcoin.hrp, serverPubKey).encode();

    assert.strictEqual(address, EXPECTED_ARK_ADDRESS);
  });

  it('produces a different address with a different delegate pubkey', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    const identity = w._getIdentity();
    const userPubKey = await identity.xOnlyPublicKey();
    const serverPubKey = hexToUint8Array(FAKE_ASP_INFO.signerPubkey).slice(1);

    const csvTimelock = { value: BigInt(FAKE_ASP_INFO.unilateralExitDelay), type: 'seconds' as const };

    const withDelegateG = new DelegateVtxo.Script({
      pubKey: userPubKey,
      serverPubKey,
      delegatePubKey: hexToUint8Array(FAKE_DELEGATE_PUBKEY).slice(1),
      csvTimelock,
    })
      .address(networks.bitcoin.hrp, serverPubKey)
      .encode();

    // 2*G in compressed form — a different on-curve pubkey.
    const altDelegate = hexToUint8Array('02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5').slice(1);
    const withDelegate2G = new DelegateVtxo.Script({
      pubKey: userPubKey,
      serverPubKey,
      delegatePubKey: altDelegate,
      csvTimelock,
    })
      .address(networks.bitcoin.hrp, serverPubKey)
      .encode();

    assert.notStrictEqual(withDelegateG, withDelegate2G);
  });

  it('locks the namespace value so a derivation tweak cannot silently re-key Realm', () => {
    // BlueWallet's per-wallet Realm path is keyed by hashIt(secret). A change
    // in this hash splits a wallet from its existing Realm file and Keychain
    // entry, stranding funds. Pin it.
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);
    const namespace = w.getNamespace();
    assert.strictEqual(namespace, EXPECTED_NAMESPACE);
  });
});

describe('LightningArkWallet derivation regression — full init pipeline', () => {
  // The algorithmic test above replicates the SDK's setupWalletConfig recipe
  // inline. That catches SDK-level drift but not BlueWallet wiring drift —
  // e.g., dropping `delegatorProvider` from Wallet.create at
  // class/wallets/lightning-ark-wallet.ts:139 would leave the algorithmic
  // test green even though the running wallet would now derive a
  // DefaultVtxo address. This block actually runs `wallet.init()` against
  // the canned providers and asserts the address matches the pinned value,
  // so any wiring change at the call site is caught.
  //
  // Offline init requires three mock layers:
  //   - SDK provider spies (getInfo, getDelegateInfo, fees, limits) so no
  //     HTTP traffic;
  //   - VtxoManager.initializeSubscription stub so the SDK doesn't open SSE
  //     subscriptions or schedule polling timers from its constructor;
  //   - resetArkadeTestState() in afterEach BEFORE restoring spies so the
  //     wallet's setTimeout(VTXO renewal, 1s) — registered at the end of
  //     init — finds an empty staticWalletCache when it eventually fires
  //     and short-circuits before reaching SDK methods that no longer have
  //     stubs installed.
  beforeEach(() => {
    // Fake timers prevent the wallet's `setTimeout(VTXO renewal, 1s)` at the
    // tail of init() from leaking past the test (Jest force-kills the worker
    // otherwise). The full-init derivation does not depend on any real
    // timer firing — it returns synchronously after Wallet.create. Modern
    // fake timers leave the promise microtask queue untouched, so awaits
    // still resolve normally.
    jest.useFakeTimers();
    installSdkProviderSpies();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    // Order matters: clear caches before restoring prototype spies. If the
    // wallet's setTimeout had still been live, an empty staticWalletCache
    // would short-circuit its callback before reaching SDK methods that no
    // longer have stubs installed.
    resetArkadeTestState();
    restoreSdkProviderSpies();
  });

  it('init() + getArkAddress() returns the locked address (catches delegatorProvider wiring drift)', async () => {
    const w = new LightningArkWallet();
    w.setSecret('arkade://' + TEST_MNEMONIC);

    await w.init();
    const address = await w.getArkAddress();

    assert.strictEqual(address, EXPECTED_ARK_ADDRESS);
  });
});
