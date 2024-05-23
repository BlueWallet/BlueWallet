import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const ReceiveDetails = lazy(() => import('../screen/receive/details'));

export const ReceiveDetailsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReceiveDetails />
  </Suspense>
);
