import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

// Define lazy imports with more reliable loading patterns
const WalletsAdd = lazy(() => {
  console.log('Loading Add wallet component...');
  return import('../screen/wallets/Add').catch(error => {
    console.error('Failed to load Add wallet component:', error);
    return { default: () => null };
  });
});
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

interface AddComponentProps {
  // Define additional props if needed
}

export const AddComponent: React.FC<AddComponentProps> = (props: AddComponentProps) => {
  console.log('Rendering AddComponent wrapper');
  return (
    <Suspense fallback={<LazyLoadingIndicator />}>
      <WalletsAdd {...props} />
    </Suspense>
  );
};

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
