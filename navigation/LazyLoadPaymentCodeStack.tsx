import React, { lazy, Suspense } from 'react';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const PaymentCode = lazy(() => import('../screen/wallets/PaymentCode'));
const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));

export const PaymentCodeComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PaymentCode />
  </Suspense>
);

export const PaymentCodesListComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PaymentCodesList />
  </Suspense>
);
