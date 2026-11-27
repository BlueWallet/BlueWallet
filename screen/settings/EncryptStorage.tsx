import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../../components/Icon';
import { securityScore } from '../../components/settings/securityScore';
import {
  biometricLabel,
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSwitchRow,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { MODAL_TYPES } from '../PromptPasswordConfirmationSheet.types';
import { appAlert } from '../../components/AppDialog';

enum ActionType {
  SetLoading = 'SET_LOADING',
  SetStorageEncryptedSwitch = 'SET_STORAGE_ENCRYPTED_SWITCH',
  SetDeviceBiometricCapable = 'SET_DEVICE_BIOMETRIC_CAPABLE',
  SetCurrentLoadingSwitch = 'SET_CURRENT_LOADING_SWITCH',
  SetModalType = 'SET_MODAL_TYPE',
}

interface Action {
  type: ActionType;
  payload?: any;
}

interface State {
  isLoading: boolean;
  storageIsEncryptedSwitchEnabled: boolean;
  deviceBiometricCapable: boolean;
  currentLoadingSwitch: string | null;
  modalType: keyof typeof MODAL_TYPES;
}

const initialState: State = {
  isLoading: true,
  storageIsEncryptedSwitchEnabled: false,
  deviceBiometricCapable: false,
  currentLoadingSwitch: null,
  modalType: MODAL_TYPES.ENTER_PASSWORD,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetLoading:
      return { ...state, isLoading: action.payload };
    case ActionType.SetStorageEncryptedSwitch:
      return { ...state, storageIsEncryptedSwitchEnabled: action.payload };
    case ActionType.SetDeviceBiometricCapable:
      return { ...state, deviceBiometricCapable: action.payload };
    case ActionType.SetCurrentLoadingSwitch:
      return { ...state, currentLoadingSwitch: action.payload };
    case ActionType.SetModalType:
      return { ...state, modalType: action.payload };
    default:
      return state;
  }
};

const EncryptStorage = () => {
  const { isStorageEncrypted, canUpgradeEncryption } = useStorage();
  const { isPrivacyBlurEnabled, setIsPrivacyBlurEnabled } = useSettings();
  const { isDeviceBiometricCapable, biometricEnabled, setBiometricUseEnabled, deviceBiometricType } = useBiometrics();
  const [state, dispatch] = useReducer(reducer, initialState);
  // The summary waits for the first read, so it never shows a count that then jumps.
  const [ready, setReady] = useState(false);
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();

  const initializeState = useCallback(async () => {
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    const isDeviceBiometricCapableSync = await isDeviceBiometricCapable();
    dispatch({ type: ActionType.SetStorageEncryptedSwitch, payload: isStorageEncryptedSwitchEnabled });
    dispatch({ type: ActionType.SetDeviceBiometricCapable, payload: isDeviceBiometricCapableSync });
    dispatch({ type: ActionType.SetLoading, payload: false });
    setReady(true);
  }, [isStorageEncrypted, isDeviceBiometricCapable]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  useFocusEffect(
    useCallback(() => {
      initializeState();
      dispatch({ type: ActionType.SetLoading, payload: false });
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    }, [initializeState]),
  );

  const handleDecryptStorage = async () => {
    dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.ENTER_PASSWORD });
    navigation.navigate('PromptPasswordConfirmationSheet', {
      modalType: MODAL_TYPES.ENTER_PASSWORD,
      returnTo: 'EncryptStorage',
    });
  };

  const onEncryptStorageSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'encrypt' });
    dispatch({ type: ActionType.SetLoading, payload: true });

    if (value) {
      dispatch({ type: ActionType.SetModalType, payload: MODAL_TYPES.CREATE_PASSWORD });
      navigation.navigate('PromptPasswordConfirmationSheet', {
        modalType: MODAL_TYPES.CREATE_PASSWORD,
        returnTo: 'EncryptStorage',
      });
    } else {
      appAlert(
        loc.settings.encrypt_decrypt,
        loc.settings.encrypt_decrypt_q,
        [
          {
            text: loc._.cancel,
            style: 'cancel',
            onPress: () => {
              dispatch({ type: ActionType.SetLoading, payload: false });
              dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
            },
          },
          {
            text: loc._.ok,
            style: 'destructive',
            onPress: handleDecryptStorage,
          },
        ],
        { cancelable: false },
      );
    }
  };

  const onUseBiometricSwitch = async (value: boolean) => {
    dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: 'biometric' });
    if (await unlockWithBiometrics()) {
      setBiometricUseEnabled(value);
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    } else {
      dispatch({ type: ActionType.SetCurrentLoadingSwitch, payload: null });
    }
  };

  const encrypted = state.storageIsEncryptedSwitchEnabled;
  const bioName = biometricLabel(deviceBiometricType);
  const score = securityScore({
    biometricsAvailable: state.deviceBiometricCapable,
    biometricsOn: biometricEnabled,
    encrypted,
    screenshotsBlocked: isPrivacyBlurEnabled,
  });
  const scoreTitle = String(loc.formatString(loc.settings.security_score, { on: score.on, total: score.total }));
  const scoreHint = score.full
    ? loc.settings.security_hint_full
    : !encrypted
      ? loc.settings.security_hint_password
      : loc.settings.security_hint_rest;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.settings.encrypt_title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {ready && (
          <SettingsCard style={styles.scoreCard}>
            <View style={styles.scoreRow} accessible accessibilityLabel={`${scoreTitle}. ${scoreHint}`}>
              <View style={[styles.scoreIcon, { backgroundColor: score.full ? p.ok.bg : p.warnBg }]}>
                <Icon name="verified-user" type="material" size={28} color={score.full ? p.ok.dot : p.accentText} />
              </View>
              <View style={styles.scoreTexts}>
                <Text style={[styles.scoreTitle, { color: p.ink }]}>{scoreTitle}</Text>
                <Text style={[styles.scoreHint, { color: p.mutedOnCard }]}>{scoreHint}</Text>
              </View>
            </View>
            <View style={styles.bars}>
              {Array.from({ length: score.total }, (_, i) => (
                <View key={i} style={[styles.bar, { backgroundColor: i < score.on ? (score.full ? p.ok.dot : p.accent) : p.switchOff }]} />
              ))}
            </View>
          </SettingsCard>
        )}

        {state.deviceBiometricCapable && (
          <View>
            <SettingsSectionLabel>{loc.settings.biometrics}</SettingsSectionLabel>
            <SettingsCard>
              <SettingsSwitchRow
                icon="fingerprint"
                title={String(loc.formatString(loc.settings.encrypt_use, { type: bioName }))}
                subtitle={loc.settings.security_bio_expl}
                value={biometricEnabled}
                onValueChange={onUseBiometricSwitch}
                disabled={state.currentLoadingSwitch !== null}
                loading={state.currentLoadingSwitch === 'biometric' && state.isLoading}
              />
            </SettingsCard>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.settings.encrypt_tstorage}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsSwitchRow
              icon="vpn-key"
              title={loc.settings.encrypt_enc_and_pass}
              badge={ready && !encrypted ? loc.settings.encrypt_recommended : undefined}
              subtitle={loc.settings.encrypt_storage_expl}
              value={encrypted}
              onValueChange={onEncryptStorageSwitch}
              disabled={state.currentLoadingSwitch !== null}
              loading={state.currentLoadingSwitch === 'encrypt' && state.isLoading}
              testID="EncyptedAndPasswordProtected"
              switchTestID="EncyptedAndPasswordProtectedSwitch"
            />
            {ready && encrypted && canUpgradeEncryption() ? (
              <SettingsRow
                icon="enhanced-encryption"
                title={loc.settings.encryption_upgrade_title}
                subtitle={loc.settings.encryption_upgrade_row_subtitle}
                badge={loc.settings.encrypt_recommended}
                divider
                onPress={() => navigation.navigate('EncryptionUpgradeSheet')}
                testID="EncryptionUpgradeRow"
              />
            ) : null}
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.security_screen}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsSwitchRow
              icon="screenshot"
              title={loc.settings.block_screenshots}
              subtitle={loc.settings.block_screenshots_expl}
              value={isPrivacyBlurEnabled}
              onValueChange={setIsPrivacyBlurEnabled}
              testID="BlockScreenshots"
            />
          </SettingsCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 18 },
  scoreCard: { paddingVertical: 16, rowGap: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  scoreIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  scoreTexts: { flex: 1, rowGap: 3 },
  scoreTitle: { fontSize: 17, fontWeight: '600' },
  scoreHint: { fontSize: 13, lineHeight: 18 },
  bars: { flexDirection: 'row', columnGap: 4 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
});

export default EncryptStorage;
