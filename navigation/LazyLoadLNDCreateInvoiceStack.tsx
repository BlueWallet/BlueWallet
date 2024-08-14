import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const LNDCreateInvoice = lazy(() => import('../screen/lnd/lndCreateInvoice'));
const LNDViewInvoice = lazy(() => import('../screen/lnd/lndViewInvoice'));
const LNDViewAdditionalInvoiceInformation = lazy(() => import('../screen/lnd/lndViewAdditionalInvoiceInformation'));
const LNDViewAdditionalInvoicePreImage = lazy(() => import('../screen/lnd/lndViewAdditionalInvoicePreImage'));

export const LNDCreateInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDCreateInvoice />
  </Suspense>
);

export const LNDViewInvoiceComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDViewInvoice />
  </Suspense>
);

export const LNDViewAdditionalInvoiceInformationComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDViewAdditionalInvoiceInformation />
  </Suspense>
);

export const LNDViewAdditionalInvoicePreImageComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDViewAdditionalInvoicePreImage />
  </Suspense>
);
