import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const LNDCreateInvoice = lazy(() => import('../screen/lnd/lndCreateInvoice'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const LNDViewInvoice = lazy(() => import('../screen/lnd/lndViewInvoice'));
const LNDViewAdditionalInvoicePreImage = lazy(() => import('../screen/lnd/lndViewAdditionalInvoicePreImage'));

export const LNDCreateInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDCreateInvoice />
  </Suspense>
);

export const SelectWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SelectWallet />
  </Suspense>
);

export const LNDViewInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDViewInvoice />
  </Suspense>
);

export const LNDViewAdditionalInvoicePreImageComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDViewAdditionalInvoicePreImage />
  </Suspense>
);
