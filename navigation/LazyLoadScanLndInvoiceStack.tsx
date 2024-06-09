import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

// Lazy loading components for the navigation stack
const ScanLndInvoice = lazy(() => import('../screen/lnd/scanLndInvoice'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const Success = lazy(() => import('../screen/send/success'));
const LnurlPay = lazy(() => import('../screen/lnd/lnurlPay'));
const LnurlPaySuccess = lazy(() => import('../screen/lnd/lnurlPaySuccess'));

export const ScanLndInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ScanLndInvoice />
  </Suspense>
);

export const SelectWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SelectWallet />
  </Suspense>
);

export const SuccessComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Success />
  </Suspense>
);

export const LnurlPayComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LnurlPay />
  </Suspense>
);

export const LnurlPaySuccessComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LnurlPaySuccess />
  </Suspense>
);
