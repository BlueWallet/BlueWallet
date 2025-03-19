import React, { lazy, Suspense } from 'react';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const ViewEditMultisigCosigners = lazy(() =>
  import('../screen/wallets/ViewEditMultisigCosigners').then(module => ({ default: module.default })),
);

export const ViewEditMultisigCosignersComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ViewEditMultisigCosigners />
  </Suspense>
);
