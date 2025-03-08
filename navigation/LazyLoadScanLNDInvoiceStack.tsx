import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

// Lazy loading components for the navigation stack
const ScanLNDInvoice = lazy(() => import('../screen/lnd/ScanLNDInvoice'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const Success = lazy(() => import('../screen/send/success'));
const LnurlPay = lazy(() => import('../screen/lnd/lnurlPay'));
const LnurlPaySuccess = lazy(() => import('../screen/lnd/lnurlPaySuccess'));

export const ScanLNDInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ScanLNDInvoice />
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
