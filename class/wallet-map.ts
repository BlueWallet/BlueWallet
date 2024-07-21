export type WalletType =
  | 'HDAezeedWallet'
  | 'HDLegacyBreadwallet'
  | 'HDLegacyElectrumSeedP2PKH'
  | 'HDLegacyP2PKH'
  | 'HDSegwitBech32'
  | 'HDSegwitElectrumSeedP2WPKHWallet'
  | 'HDSegwitP2SH'
  | 'Legacy'
  | 'LightningCustodianWallet'
  | 'LightningLdkWallet'
  | 'MultisigHDWallet'
  | 'SLIP39LegacyP2PKH'
  | 'SLIP39SegwitBech32'
  | 'SLIP39SegwitP2SH'
  | 'SegwitBech32'
  | 'SegwitP2SH'
  | 'WatchOnly';

export type WalletClassConstructor = new (...args: any[]) => any;

const walletImports: { [key in WalletType]: () => Promise<WalletClassConstructor> } = {
  HDAezeedWallet: () => import('./wallets/hd-aezeed-wallet').then(module => module.default),
  HDLegacyBreadwallet: () => import('./wallets/hd-legacy-breadwallet-wallet').then(module => module.default),
  HDLegacyElectrumSeedP2PKH: () => import('./wallets/hd-legacy-electrum-seed-p2pkh-wallet').then(module => module.default),
  HDLegacyP2PKH: () => import('./wallets/hd-legacy-p2pkh-wallet').then(module => module.default),
  HDSegwitBech32: () => import('./wallets/hd-segwit-bech32-wallet').then(module => module.default),
  HDSegwitElectrumSeedP2WPKHWallet: () => import('./wallets/hd-segwit-electrum-seed-p2wpkh-wallet').then(module => module.default),
  HDSegwitP2SH: () => import('./wallets/hd-segwit-p2sh-wallet').then(module => module.default),
  Legacy: () => import('./wallets/legacy-wallet').then(module => module.default),
  LightningCustodianWallet: () => import('./wallets/lightning-custodian-wallet').then(module => module.default),
  LightningLdkWallet: () => import('./wallets/lightning-ldk-wallet').then(module => module.default),
  MultisigHDWallet: () => import('./wallets/multisig-hd-wallet').then(module => module.default),
  SLIP39LegacyP2PKH: () => import('./wallets/slip39-wallets').then(module => module.SLIP39LegacyP2PKHWallet),
  SLIP39SegwitBech32: () => import('./wallets/slip39-wallets').then(module => module.SLIP39SegwitBech32Wallet),
  SLIP39SegwitP2SH: () => import('./wallets/slip39-wallets').then(module => module.SLIP39SegwitP2SHWallet),
  SegwitBech32: () => import('./wallets/segwit-bech32-wallet').then(module => module.default),
  SegwitP2SH: () => import('./wallets/segwit-p2sh-wallet').then(module => module.default),
  WatchOnly: () => import('./wallets/watch-only-wallet').then(module => module.default),
};

export async function dynamicImportWallet(type: WalletType): Promise<WalletClassConstructor> {
  const importFn = walletImports[type];
  if (!importFn) {
    throw new Error(`Unsupported wallet type: ${type}`);
  }
  return importFn();
}