import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

// Define lazy imports
const WalletsAdd = lazy(() => import('../screen/wallets/Add'));
const ImportCustomDerivationPath = lazy(() => import('../screen/wallets/ImportCustomDerivationPath'));
const ImportWalletDiscovery = lazy(() => import('../screen/wallets/ImportWalletDiscovery'));
const ImportSpeed = lazy(() => import('../screen/wallets/ImportSpeed'));
const ImportWallet = lazy(() => import('../screen/wallets/ImportWallet'));
const PleaseBackup = lazy(() => import('../screen/wallets/PleaseBackup'));
const PleaseBackupLNDHub = lazy(() => import('../screen/wallets/pleaseBackupLNDHub'));
const ProvideEntropy = lazy(() => import('../screen/wallets/ProvideEntropy'));
const WalletsAddMultisig = lazy(() => import('../screen/wallets/WalletsAddMultisig'));
const WalletsAddMultisigStep2 = lazy(() => import('../screen/wallets/addMultisigStep2'));
const WalletsAddMultisigHelp = lazy(() => import('../screen/wallets/addMultisigHelp'));

export const AddComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletsAdd />
  </Suspense>
);

export const ImportWalletDiscoveryComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ImportWalletDiscovery />
  </Suspense>
);

export const ImportCustomDerivationPathComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ImportCustomDerivationPath />
  </Suspense>
);

export const ImportWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ImportWallet />
  </Suspense>
);

export const ImportSpeedComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ImportSpeed />
  </Suspense>
);

export const PleaseBackupComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PleaseBackup />
  </Suspense>
);

export const PleaseBackupLNDHubComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PleaseBackupLNDHub />
  </Suspense>
);

export const ProvideEntropyComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ProvideEntropy />
  </Suspense>
);

export const WalletsAddMultisigComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletsAddMultisig />
  </Suspense>
);

export const WalletsAddMultisigStep2Component = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletsAddMultisigStep2 />
  </Suspense>
);

export const WalletsAddMultisigHelpComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletsAddMultisigHelp />
  </Suspense>
);
