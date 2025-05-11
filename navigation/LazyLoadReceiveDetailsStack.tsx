import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const ReceiveDetails = lazy(() => import('../screen/receive/ReceiveDetails'));

export const ReceiveDetailsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReceiveDetails />
  </Suspense>
);
