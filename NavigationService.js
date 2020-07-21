/* eslint-disable no-unused-expressions */
import * as React from 'react';
import { CommonActions } from '@react-navigation/native';
import Biometric from './class/biometrics';
import RNShake from 'react-native-shake';
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
  const isShakeToLockEnabled = await BlueApp.isShakeToLockEnabled();

  if ((isShakeToLockEnabled || force) && (isStorageEncrypted || isBiometricUseCapableAndEnabled)) {
    dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'UnlockWithScreenRoot' }],
      }),
    );
  }
}

export function removeShakeToLockListener() {
  RNShake.removeEventListener('ShakeEvent');
}

export async function addShakeToLockListener() {
  const BlueApp = require('./BlueApp');
  const isBiometricUseCapableAndEnabled = Biometric.isBiometricUseCapableAndEnabled();
  const isStorageEncrypted = await BlueApp.storageIsEncrypted();
  const isShakeToLockEnabled = await BlueApp.isShakeToLockEnabled();

  if (isShakeToLockEnabled && (isStorageEncrypted || isBiometricUseCapableAndEnabled)) {
    RNShake.addEventListener('ShakeEvent', lockScreen);
  }
}
