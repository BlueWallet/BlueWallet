import assert from 'assert';

import startImport, { normalizeDerivationPath, validateBip32 } from '../../class/wallet-import';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { SegwitBech32Wallet } from '../../class/wallets/segwit-bech32-wallet';
import { SegwitP2SHWallet } from '../../class/wallets/segwit-p2sh-wallet';
import { TaprootWallet } from '../../class/wallets/taproot-wallet';
import { TWallet } from '../../class/wallets/types';

describe('validateBip32', () => {
  it('requires an m/ prefix so bip174 does not drop the first path level', () => {
    assert.ok(validateBip32("m/84'/0'/0'"));
    assert.ok(validateBip32("m/0'"));
    assert.ok(validateBip32('m/0/0'));
    assert.ok(validateBip32("m/84/0'/0'")); // mixed hardened and non-hardened levels
    assert.ok(validateBip32('m/84/0/0')); // all non-hardened
    assert.ok(!validateBip32("84'/0'/0'"));
    assert.ok(!validateBip32('m'));
    assert.ok(!validateBip32('m//0')); // empty path segment
    assert.ok(!validateBip32(''));
  });

  it('accepts h and H hardened notation the same as an apostrophe', () => {
    assert.ok(validateBip32('m/84h/0h/0h'));
    assert.ok(validateBip32('m/84H/0H/0H'));
    assert.ok(validateBip32("M/84'/0'/0'")); // leading M is normalized to m
    assert.ok(validateBip32("  m/0'  ")); // surrounding whitespace is trimmed
  });
});

describe('normalizeDerivationPath', () => {
  it('canonicalizes h/H and smart quotes to apostrophes', () => {
    assert.strictEqual(normalizeDerivationPath('m/84h/0h/0h'), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath('m/84H/0H/0H'), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath('m/84‘/0’/0’'), "m/84'/0'/0'"); // iOS smart quotes
    assert.strictEqual(normalizeDerivationPath("M/84'/0'/0'"), "m/84'/0'/0'");
    assert.strictEqual(normalizeDerivationPath("  m/0'  "), "m/0'");
    assert.strictEqual(normalizeDerivationPath("m/84'/0'/0'"), "m/84'/0'/0'"); // already canonical
  });
});

describe('startImport: WIF with a script type prefix', () => {
  // private key 1, a public test vector: never send funds to it
  const WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
  const WIF_UNCOMPRESSED = '5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf';
  const WIF_TESTNET = 'cMahea7zqjxrtgAbB7LSGbcQUr1uX1ojuat9jZodMN87JcbXMTcA';

  // offline mode: no Electrum server, every wallet is considered used
  const importOffline = async (text: string) => {
    const wallets: TWallet[] = [];
    const progress: string[] = [];
    const { promise } = startImport(
      text,
      false,
      false,
      true,
      p => progress.push(p),
      w => wallets.push(w),
      async () => {
        throw new Error('no password expected');
      },
    );
    await promise;
    return { wallets, progress };
  };

  it.each([
    ['p2pkh', LegacyWallet.type, '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH'],
    ['p2wpkh', SegwitBech32Wallet.type, 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
    ['p2wpkh-p2sh', SegwitP2SHWallet.type, '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN'],
    ['p2tr', TaprootWallet.type, 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9'],
  ])('imports %s:WIF as a single wallet of that type', async (prefix, type, address) => {
    const { wallets, progress } = await importOffline(`${prefix}:${WIF}`);
    assert.strictEqual(wallets.length, 1);
    assert.strictEqual(wallets[0].type, type);
    assert.strictEqual(wallets[0].getSecret(), WIF);
    assert.strictEqual(wallets[0].getAddress(), address);
    assert.deepStrictEqual(progress, [`wif ${prefix}`]); // no probing of other script types
  });

  it('accepts an upper case prefix and whitespace around the key', async () => {
    const { wallets } = await importOffline(`  P2WPKH: ${WIF}\n`);
    assert.strictEqual(wallets.length, 1);
    assert.strictEqual(wallets[0].type, SegwitBech32Wallet.type);
    assert.strictEqual(wallets[0].getAddress(), 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
  });

  it('imports p2pkh:WIF with an uncompressed key', async () => {
    const { wallets } = await importOffline(`p2pkh:${WIF_UNCOMPRESSED}`);
    assert.strictEqual(wallets.length, 1);
    assert.strictEqual(wallets[0].type, LegacyWallet.type);
    assert.strictEqual(wallets[0].getAddress(), '1EHNa6Q4Jz2uvNExL497mE43ikXhwF6kZm');
  });

  it.each(['p2wpkh', 'p2wpkh-p2sh', 'p2tr'])('does not import %s:WIF with an uncompressed key', async prefix => {
    const { wallets } = await importOffline(`${prefix}:${WIF_UNCOMPRESSED}`);
    assert.strictEqual(wallets.length, 0);
  });

  it('does not import a prefixed testnet WIF, same as a bare one', async () => {
    assert.strictEqual((await importOffline(`p2wpkh:${WIF_TESTNET}`)).wallets.length, 0);
    assert.strictEqual((await importOffline(WIF_TESTNET)).wallets.length, 0);
  });

  it('does not import an unknown prefix or a prefix with garbage', async () => {
    assert.strictEqual((await importOffline(`p2wsh:${WIF}`)).wallets.length, 0);
    assert.strictEqual((await importOffline(`foo:${WIF}`)).wallets.length, 0);
    assert.strictEqual((await importOffline('p2wpkh:notakey')).wallets.length, 0);
    assert.strictEqual((await importOffline(`p2wpkh:${WIF} ${WIF}`)).wallets.length, 0);
  });

  it('still imports a bare WIF as all four script types', async () => {
    const { wallets } = await importOffline(WIF);
    const byType = Object.fromEntries(wallets.map(w => [w.type, w.getAddress()]));
    assert.strictEqual(byType[SegwitBech32Wallet.type], 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
    assert.strictEqual(byType[SegwitP2SHWallet.type], '3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN');
    assert.strictEqual(byType[LegacyWallet.type], '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    assert.strictEqual(byType[TaprootWallet.type], 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9');
  });
});
