import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import ReceiveCustomAmount from '../screen/receive/ReceiveCustomAmount';

const ReceiveDetails = lazy(() => import('../screen/receive/details'));

export const ReceiveDetailsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReceiveDetails />
  </Suspense>
);

export const ReceiveCustomAmountComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReceiveCustomAmount />
  </Suspense>
);
