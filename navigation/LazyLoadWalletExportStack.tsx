import React, { lazy, Suspense } from 'react';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

// Define lazy imports
const WalletExport = lazy(() => import('../screen/wallets/export'));

export const WalletExportComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletExport />
  </Suspense>
);
