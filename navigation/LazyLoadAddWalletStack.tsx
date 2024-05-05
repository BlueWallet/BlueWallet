import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Define lazy imports
const WalletsAdd = lazy(() => import('../screen/wallets/Add'));
const ImportCustomDerivationPath = lazy(() => import('../screen/wallets/importCustomDerivationPath'));
const ImportWalletDiscovery = lazy(() => import('../screen/wallets/importDiscovery'));
const ImportWallet = lazy(() => import('../screen/wallets/import'));
const PleaseBackup = lazy(() => import('../screen/wallets/PleaseBackup'));
const PleaseBackupLNDHub = lazy(() => import('../screen/wallets/pleaseBackupLNDHub'));
const PleaseBackupLdk = lazy(() => import('../screen/wallets/pleaseBackupLdk'));
const ProvideEntropy = lazy(() => import('../screen/wallets/provideEntropy'));
const WalletsAddMultisig = lazy(() => import('../screen/wallets/addMultisig'));
const WalletsAddMultisigStep2 = lazy(() => import('../screen/wallets/addMultisigStep2'));
const WalletsAddMultisigHelp = lazy(() => import('../screen/wallets/addMultisigHelp'));

const LoadingIndicator = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" />
  </View>
);

export const AddComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <WalletsAdd />
  </Suspense>
);

export const ImportWalletDiscoveryComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <ImportWalletDiscovery />
  </Suspense>
);

export const ImportCustomDerivationPathComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <ImportCustomDerivationPath />
  </Suspense>
);

export const ImportWalletComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <ImportWallet />
  </Suspense>
);

export const PleaseBackupComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <PleaseBackup />
  </Suspense>
);

export const PleaseBackupLNDHubComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <PleaseBackupLNDHub />
  </Suspense>
);

export const PleaseBackupLdkComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <PleaseBackupLdk />
  </Suspense>
);

export const ProvideEntropyComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <ProvideEntropy />
  </Suspense>
);

export const WalletsAddMultisigComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <WalletsAddMultisig />
  </Suspense>
);

export const WalletsAddMultisigStep2Component = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <WalletsAddMultisigStep2 />
  </Suspense>
);

export const WalletsAddMultisigHelpComponent = () => (
  <Suspense fallback={<LoadingIndicator />}>
    <WalletsAddMultisigHelp />
  </Suspense>
);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
