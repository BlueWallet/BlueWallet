/* eslint-disable no-unused-expressions */
import * as React from 'react';
import { CommonActions } from '@react-navigation/native';
import Biometric from './class/biometrics';
const BlueApp = require('./BlueApp');

export const navigationRef = React.createRef();

export function navigate(name, params) {
  navigationRef.current?.navigate(name, params);
}

export function dispatch(params) {
  navigationRef.current?.dispatch(params);
}
export async function lockScreen(force = false) {
  const isBiometricUseCapableAndEnabled = Biometric.isBiometricUseCapableAndEnabled();
  const isStorageEncrypted = await BlueApp.storageIsEncrypted();

  if (isStorageEncrypted || isBiometricUseCapableAndEnabled) {
    dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'UnlockWithScreenRoot' }],
      }),
    );
  }
}
