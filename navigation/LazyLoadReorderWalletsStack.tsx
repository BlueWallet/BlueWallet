import React, { lazy, Suspense } from 'react';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const ReorderWallets = lazy(() => import('../screen/wallets/reorderWallets'));

export const ReorderWalletsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReorderWallets />
  </Suspense>
);
