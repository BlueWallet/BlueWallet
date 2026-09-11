import { Platform } from 'react-native';
import Keychain, { hasGenericPassword } from 'react-native-keychain';

import { BlueApp, KeychainSecurityOption } from '../class/blue-app';
import { hasLegacySecureValue } from './legacy-secure-storage';

export type KeychainDiagnostic = {
  label: string;
  value: string;
  status: 'ok' | 'info' | 'warning' | 'error';
};

const policyLabel = (policy: KeychainSecurityOption | 'disabled') => {
  switch (policy) {
    case 'biometricsOrPasscode':
      return Platform.OS === 'android' ? 'Biometrics or screen lock' : 'Biometrics or device passcode';
    case 'devicePasscode':
      return Platform.OS === 'android' ? 'Screen lock only' : 'Device passcode only';
    default:
      return 'Off';
  }
};

const readSensitiveActionsPolicy = async (
  appUnlockPolicy: KeychainSecurityOption | 'disabled',
): Promise<{ policy: KeychainSecurityOption | 'disabled'; migrated: boolean }> => {
  const credentials = await Keychain.getGenericPassword({ service: BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE });
  if (!credentials) return { policy: appUnlockPolicy, migrated: false };
  if (credentials.password !== 'disabled' && credentials.password !== 'biometricsOrPasscode' && credentials.password !== 'devicePasscode') {
    throw new Error('Invalid sensitive-actions policy value');
  }
  return { policy: credentials.password, migrated: true };
};

/** Collects metadata only. It never reads wallet ciphertext or encryption-key credentials. */
export const collectKeychainDiagnostics = async (): Promise<KeychainDiagnostic[]> => {
  const app = BlueApp.getInstance();
  const [biometry, passcodeAvailable, securityLevel, configuredPolicy] = await Promise.all([
    Keychain.getSupportedBiometryType(),
    Keychain.isPasscodeAuthAvailable(),
    Keychain.getSecurityLevel(),
    app.getConfiguredKeychainSecurityOption(),
  ]);
  const appUnlockPolicy = configuredPolicy ?? 'disabled';
  const sensitiveActions = await readSensitiveActionsPolicy(appUnlockPolicy);

  const serviceNames = [
    BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
    BlueApp.storageKeychainService('data'),
    BlueApp.WALLET_DATA_SECONDARY_SERVICE,
    BlueApp.WALLET_DATA_MANIFEST_SERVICE,
    BlueApp.DATA_KEY_BACKUP_SERVICE,
    BlueApp.DATA_KEY_TRANSACTION_SERVICE,
    BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE,
    BlueApp.SENSITIVE_ACTIONS_PASSCODE_SERVICE,
    BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE,
  ] as const;
  const servicePresence = await Promise.all(serviceNames.map(service => hasGenericPassword({ service })));
  const presence = new Map(serviceNames.map((service, index) => [service, servicePresence[index]]));

  const legacyKeys = ['data', 'Biometrics', BlueApp.HANDOFF_STORAGE_KEY, BlueApp.DO_NOT_TRACK] as const;
  const legacyPresence = await Promise.all(legacyKeys.map(key => hasLegacySecureValue(key)));
  const legacyLeftovers = legacyKeys.filter((_, index) => legacyPresence[index]);

  const hasDataKey = presence.get(BlueApp.DATA_ENCRYPTION_KEY_SERVICE) === true;
  const dataGenerationCount = [BlueApp.storageKeychainService('data'), BlueApp.WALLET_DATA_SECONDARY_SERVICE].filter(
    service => presence.get(service) === true,
  ).length;
  const hasManifest = presence.get(BlueApp.WALLET_DATA_MANIFEST_SERVICE) === true;
  const hasRecoveryKey = presence.get(BlueApp.DATA_KEY_BACKUP_SERVICE) === true;
  const hasRecoveryTransaction = presence.get(BlueApp.DATA_KEY_TRANSACTION_SERVICE) === true;
  const walletStateStatus =
    dataGenerationCount === 0 ? (!hasDataKey && !hasManifest ? 'ok' : 'error') : hasDataKey && hasManifest ? 'ok' : 'error';
  const expectedSensitiveMarker =
    sensitiveActions.policy === 'biometricsOrPasscode'
      ? BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE
      : sensitiveActions.policy === 'devicePasscode'
        ? BlueApp.SENSITIVE_ACTIONS_PASSCODE_SERVICE
        : undefined;
  const hasSensitiveMarker = expectedSensitiveMarker ? presence.get(expectedSensitiveMarker) === true : true;
  const recoveryValue = hasRecoveryTransaction
    ? hasRecoveryKey
      ? 'Policy change pending recovery'
      : 'Transaction exists without recovery key'
    : hasRecoveryKey
      ? 'Orphan recovery key pending cleanup'
      : 'Clean';

  return [
    { label: 'Platform', value: Platform.OS, status: 'info' },
    { label: 'Biometrics', value: biometry ?? 'Not enrolled', status: biometry ? 'ok' : 'warning' },
    {
      label: Platform.OS === 'android' ? 'Screen lock' : 'Device passcode',
      value: passcodeAvailable ? 'Available' : 'Unavailable',
      status: passcodeAvailable ? 'ok' : 'warning',
    },
    {
      label: 'Native security level',
      value: securityLevel ? String(securityLevel) : Platform.OS === 'ios' ? 'Apple Keychain' : 'Unavailable',
      status: securityLevel || Platform.OS === 'ios' ? 'ok' : 'warning',
    },
    {
      label: 'Wallet encryption baseline',
      value:
        Platform.OS === 'android' ? 'Android Keystore · AES-GCM · secure software+' : 'Apple Keychain · when unlocked · this device only',
      status: 'info',
    },
    { label: 'App unlock', value: policyLabel(appUnlockPolicy), status: 'info' },
    {
      label: 'Sensitive actions',
      value: `${policyLabel(sensitiveActions.policy)}${sensitiveActions.migrated ? '' : ' · legacy fallback'}${
        expectedSensitiveMarker ? ` · marker ${hasSensitiveMarker ? 'present' : 'missing'}` : ''
      }`,
      status: !hasSensitiveMarker ? 'error' : sensitiveActions.migrated ? 'info' : 'warning',
    },
    {
      label: 'Wallet envelope',
      value:
        dataGenerationCount === 0
          ? hasDataKey || hasManifest
            ? `No data generation · key ${hasDataKey ? 'present' : 'missing'} · manifest ${hasManifest ? 'present' : 'missing'}`
            : 'No wallet data stored'
          : `${dataGenerationCount} generation${dataGenerationCount === 1 ? '' : 's'} · key ${hasDataKey ? 'present' : 'missing'} · manifest ${
              hasManifest ? 'present' : 'missing'
            }`,
      status: walletStateStatus,
    },
    {
      label: 'Recovery state',
      value: recoveryValue,
      status: recoveryValue === 'Clean' ? 'ok' : hasRecoveryKey && hasRecoveryTransaction ? 'warning' : 'error',
    },
    {
      label: 'Legacy secure storage',
      value: legacyLeftovers.length === 0 ? 'Clean' : `Leftover keys: ${legacyLeftovers.join(', ')}`,
      status: legacyLeftovers.length === 0 ? 'ok' : 'error',
    },
    ...(Platform.OS === 'ios'
      ? [
          {
            label: 'Reinstall sentinel',
            value: presence.get(BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE) ? 'Present' : 'Missing',
            status: presence.get(BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE) ? ('ok' as const) : ('warning' as const),
          },
        ]
      : []),
  ];
};
