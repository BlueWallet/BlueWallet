import assert from 'assert';

import startImport from '../../class/wallet-import';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { TWallet } from '../../class/wallets/types';

// Flat Unchained signing-device JSON from https://github.com/BlueWallet/BlueWallet/issues/8251.
// `p2wsh` is a BIP48 multisig cosigner (Zpub at m/48'/0'/0'/2') — one key of a multisig vault.
const unchainedSigningDeviceJSON = JSON.stringify({
  xfp: 'B68AF6E4',
  account: 0,
  p2wsh_deriv: 'm/48h/0h/0h/2h',
  p2wsh: 'Zpub74w9dfoeurKrKXE3SPRpFquLPTkiCuSwGuhDzBgbE42w5ShB2FxMjmJyjZpSJ6WhLt8y1PeFHQELGgq2GmktviFDH8yFWYRWg4xQiw3v335',
  p2sh_deriv: 'm/45h',
  p2sh: 'xpub69EKPNo9Jkd6v2h7xNKw5RdbFBoaHEcstXcRNfcQ2jg71iFpobCwcxfJjaV2ycGy218f2jM1znqs1SDkqMiR7fbyBVJwzacg2QarGt1gtJg',
});

// Drives startImport in offline mode (no Electrum/network) and resolves to the wallets it yields.
const runImport = (text: string): { promise: Promise<TWallet[]>; wallets: TWallet[] } => {
  const wallets: TWallet[] = [];
  const onProgress = () => {};
  const onWallet = (w: TWallet) => wallets.push(w);
  const onPassword = async () => '';
  // 4th arg `offline=true` makes wasEverUsed()/fetch no-ops so the generator never touches the network
  const { promise } = startImport(text, false, false, true, onProgress, onWallet, onPassword);
  return { promise: promise.then(() => wallets), wallets };
};

describe('wallet-import multisig-cosigner handling', () => {
  it('rejects a multisig cosigner export with guidance instead of importing it', async () => {
    const { promise, wallets } = runImport(unchainedSigningDeviceJSON);
    await assert.rejects(promise, /multisig/i, 'import should reject a multisig cosigner export');
    assert.ok(
      !wallets.some(w => w.type === WatchOnlyWallet.type),
      'no watch-only wallet should be produced from a multisig cosigner export',
    );
  });

  it('imports a regular (non-cosigner) xpub without rejection', async () => {
    const { promise } = runImport(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
    );
    const wallets = await promise;
    const wo = wallets.find(w => w.type === WatchOnlyWallet.type);
    assert.ok(wo, 'a plain zpub should import as a watch-only wallet');
  });
});
