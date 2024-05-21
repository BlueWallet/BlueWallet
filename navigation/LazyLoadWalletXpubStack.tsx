import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const WalletXpub = lazy(() => import('../screen/wallets/xpub'));

export const WalletXpubComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletXpub />
  </Suspense>
);
