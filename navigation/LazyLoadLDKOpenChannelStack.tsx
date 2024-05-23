import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const SelectWallet = lazy(() => import('../screen/wallets/selectWallet'));
const LdkOpenChannel = lazy(() => import('../screen/lnd/ldkOpenChannel'));
const Success = lazy(() => import('../screen/send/success'));

export const SelectWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SelectWallet />
  </Suspense>
);

export const LdkOpenChannelComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LdkOpenChannel />
  </Suspense>
);

export const SuccessComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Success />
  </Suspense>
);
