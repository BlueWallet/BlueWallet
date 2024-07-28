import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));

const PaymentCodesListComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PaymentCodesList />
  </Suspense>
);

export default PaymentCodesListComponent;
