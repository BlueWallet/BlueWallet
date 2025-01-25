import React, { lazy, Suspense } from 'react';

import { LazyLoadingIndicator } from './LazyLoadingIndicator';

const SendDetails = lazy(() => import('../screen/send/SendDetails'));
const Confirm = lazy(() => import('../screen/send/Confirm'));
const PsbtWithHardwareWallet = lazy(() => import('../screen/send/psbtWithHardwareWallet'));
const CreateTransaction = lazy(() => import('../screen/send/create'));
const PsbtMultisig = lazy(() => import('../screen/send/psbtMultisig'));
const PsbtMultisigQRCode = lazy(() => import('../screen/send/psbtMultisigQRCode'));
const Success = lazy(() => import('../screen/send/success'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const CoinControl = lazy(() => import('../screen/send/CoinControl'));
const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));

// Export each component with its lazy loader and optional configurations
export const SendDetailsComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SendDetails />
  </Suspense>
);
export const ConfirmComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Confirm />
  </Suspense>
);
export const PsbtWithHardwareWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PsbtWithHardwareWallet />
  </Suspense>
);
export const CreateTransactionComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <CreateTransaction />
  </Suspense>
);
export const PsbtMultisigComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PsbtMultisig />
  </Suspense>
);
export const PsbtMultisigQRCodeComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PsbtMultisigQRCode />
  </Suspense>
);
export const SuccessComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <Success />
  </Suspense>
);
export const SelectWalletComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SelectWallet />
  </Suspense>
);
export const CoinControlComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <CoinControl />
  </Suspense>
);

export const PaymentCodesListComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <PaymentCodesList />
  </Suspense>
);
