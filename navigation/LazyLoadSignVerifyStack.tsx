import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const SignVerify = lazy(() => import('../screen/wallets/signVerify'));

export const SignVerifyComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SignVerify />
  </Suspense>
);
