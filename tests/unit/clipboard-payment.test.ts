import assert from 'assert';

import {
  ClipboardPaymentKind,
  classifyClipboardPayment,
  clipboardActionOnAppStateChange,
  evaluateClipboardOnForeground,
  hashClipboardContent,
  isClipboardPaymentFromOwnWallet,
  stripBitcoinUriToAddress,
} from '../../blue_modules/clipboardPayment';
import { Chain } from '../../models/bitcoinUnits';

const P2PKH = '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG';
const P2SH = '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK';
const P2WPKH = 'bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref';
const P2TR = 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr';
const TESTNET_SEGWIT = 'tb1ql4jps5nxnyz7qxgle9dp3q0mww2jk4ckfua6lr';
const SILENT_PAYMENT =
  'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv';
const BIP47 = 'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
const LN_INVOICE =
  'lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde';
const LNURL = 'LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58';
const COMBINED_BIP21 = `bitcoin:${P2WPKH.toUpperCase()}?amount=0.000001&lightning=${LN_INVOICE}`;

describe('clipboardPayment classifier', () => {
  it('accepts mainnet script addresses including taproot', () => {
    assert.deepStrictEqual(classifyClipboardPayment(P2PKH), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2PKH,
    });
    assert.deepStrictEqual(classifyClipboardPayment(P2SH), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2SH,
    });
    assert.deepStrictEqual(classifyClipboardPayment(P2WPKH), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });
    assert.deepStrictEqual(classifyClipboardPayment(P2WPKH.toUpperCase()), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH.toUpperCase(),
    });
    assert.deepStrictEqual(classifyClipboardPayment(P2TR), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2TR,
    });
  });

  it('accepts bitcoin: URIs and trims trailing newlines', () => {
    const uri = `bitcoin:${P2TR}?amount=0.01`;
    assert.deepStrictEqual(classifyClipboardPayment(uri), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: uri,
    });
    assert.deepStrictEqual(classifyClipboardPayment(`${P2WPKH}\n`), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });
    assert.deepStrictEqual(classifyClipboardPayment(`  ${P2TR}  \n\n`), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2TR,
    });
  });

  it('uses the first line when extra trailing text is present', () => {
    assert.deepStrictEqual(classifyClipboardPayment(`${P2WPKH}\npasted from notes`), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });
  });

  it('accepts silent payments and BIP-47 payment codes', () => {
    assert.deepStrictEqual(classifyClipboardPayment(SILENT_PAYMENT), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: SILENT_PAYMENT,
    });
    assert.deepStrictEqual(classifyClipboardPayment(BIP47), {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: BIP47,
    });
  });

  it('accepts bolt11 invoices and decoded LNURLs, including lightning: prefix', () => {
    assert.deepStrictEqual(classifyClipboardPayment(LN_INVOICE), {
      kind: ClipboardPaymentKind.Lightning,
      payload: LN_INVOICE,
    });
    assert.deepStrictEqual(classifyClipboardPayment(`lightning:${LN_INVOICE}`), {
      kind: ClipboardPaymentKind.Lightning,
      payload: `lightning:${LN_INVOICE}`,
    });
    assert.deepStrictEqual(classifyClipboardPayment(LNURL), {
      kind: ClipboardPaymentKind.Lnurl,
      payload: LNURL,
    });
  });

  it('accepts combined BIP21 when the lightning invoice decodes', () => {
    const classified = classifyClipboardPayment(COMBINED_BIP21);
    assert.deepStrictEqual(classified, {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: COMBINED_BIP21,
    });
  });

  it('falls back to the on-chain URI when a combined BIP21 lightning part is not a real invoice', () => {
    const classified = classifyClipboardPayment(`bitcoin:${P2WPKH}?lightning=lnbits-not-an-invoice`);
    assert.ok(classified);
    assert.strictEqual(classified?.kind, ClipboardPaymentKind.Bitcoin);
    assert.ok(classified && stripBitcoinUriToAddress(classified.payload) === P2WPKH);
  });

  it('rejects false positives, empty clipboard, emails, and testnet', () => {
    assert.strictEqual(classifyClipboardPayment(undefined), null);
    assert.strictEqual(classifyClipboardPayment(null), null);
    assert.strictEqual(classifyClipboardPayment(''), null);
    assert.strictEqual(classifyClipboardPayment('   '), null);
    assert.strictEqual(classifyClipboardPayment('\n'), null);
    assert.strictEqual(classifyClipboardPayment('LNBits'), null);
    assert.strictEqual(classifyClipboardPayment('lnbits.com/wallet'), null);
    assert.strictEqual(classifyClipboardPayment('lnb'), null);
    assert.strictEqual(classifyClipboardPayment('LNBC'), null);
    assert.strictEqual(classifyClipboardPayment('user@gmail.com'), null);
    assert.strictEqual(classifyClipboardPayment('Please pay me at this address later'), null);
    assert.strictEqual(classifyClipboardPayment(TESTNET_SEGWIT), null);
    assert.strictEqual(classifyClipboardPayment('sp1qq'), null);
    assert.strictEqual(classifyClipboardPayment('lnurl1qqqqqqqqqq'), null);
  });
});

describe('clipboardPayment ownership and last-seen', () => {
  it('does not offer a BIP21 URI for an address the wallet already owns', () => {
    const wallets = [
      {
        chain: Chain.ONCHAIN,
        isAddressValid: (address: string) => address === P2WPKH,
        weOwnAddress: (address: string) => address === P2WPKH,
      },
    ];
    assert.ok(isClipboardPaymentFromOwnWallet(`bitcoin:${P2WPKH}?amount=1`, wallets));
    assert.ok(!isClipboardPaymentFromOwnWallet(P2TR, wallets));
  });

  it('does not offer an invoice generated by a lightning wallet', () => {
    const wallets = [
      {
        chain: Chain.OFFCHAIN,
        weOwnAddress: () => false,
        isInvoiceGeneratedByWallet: (invoice: string) => invoice === LN_INVOICE,
      },
    ];
    assert.ok(isClipboardPaymentFromOwnWallet(`lightning:${LN_INVOICE}`, wallets));
    assert.ok(!isClipboardPaymentFromOwnWallet(P2WPKH, wallets));
  });

  it('suppresses repeats via last-seen hash and still offers a newly copied payment', () => {
    const wallets: { chain: string; weOwnAddress: () => boolean }[] = [];
    const first = evaluateClipboardOnForeground(P2WPKH, undefined, wallets);
    assert.deepStrictEqual(first.offer, {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });

    const repeat = evaluateClipboardOnForeground(P2WPKH, first.nextHash, wallets);
    assert.strictEqual(repeat.offer, null);
    assert.strictEqual(repeat.nextHash, first.nextHash);

    const empty = evaluateClipboardOnForeground(undefined, first.nextHash, wallets);
    assert.strictEqual(empty.offer, null);

    const next = evaluateClipboardOnForeground(P2TR, empty.nextHash, wallets);
    assert.deepStrictEqual(next.offer, {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2TR,
    });
    assert.notStrictEqual(next.nextHash, empty.nextHash);
  });

  it('offers the same payment again when last-seen is ignored after a paste prompt', () => {
    const wallets: { chain: string; weOwnAddress: () => boolean }[] = [];
    const first = evaluateClipboardOnForeground(P2WPKH, undefined, wallets);
    assert.ok(first.offer);
    const skipped = evaluateClipboardOnForeground(P2WPKH, first.nextHash, wallets);
    assert.strictEqual(skipped.offer, null);
    const retried = evaluateClipboardOnForeground(P2WPKH, first.nextHash, wallets, { ignoreLastSeen: true });
    assert.deepStrictEqual(retried.offer, {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });
  });

  it('does not re-read clipboard after Control Center (inactive), but retries after a paste prompt', () => {
    assert.strictEqual(
      clipboardActionOnAppStateChange({
        previous: 'inactive',
        next: 'active',
        shouldRetryPaste: false,
      }),
      'none',
    );
    assert.strictEqual(
      clipboardActionOnAppStateChange({
        previous: 'inactive',
        next: 'active',
        shouldRetryPaste: true,
      }),
      'retry_read',
    );
    assert.strictEqual(
      clipboardActionOnAppStateChange({
        previous: 'background',
        next: 'active',
        shouldRetryPaste: false,
      }),
      'read',
    );
  });

  it('offers a payment when the persisted last-seen hash is from different content', () => {
    const seed = hashClipboardContent('old notes');
    const result = evaluateClipboardOnForeground(P2WPKH, seed, []);
    assert.deepStrictEqual(result.offer, {
      kind: ClipboardPaymentKind.Bitcoin,
      payload: P2WPKH,
    });
  });

  it('does not offer unrelated clipboard after a change', () => {
    const seed = hashClipboardContent('old notes');
    const result = evaluateClipboardOnForeground('LNBits', seed, []);
    assert.strictEqual(result.offer, null);
    assert.notStrictEqual(result.nextHash, seed);
  });
});
