/**
 * Settings › Network › Block explorer: which explorer opens a transaction or
 * an address, for each network, or one of the user's own for one network.
 */
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../../loc';
import {
  getBlockExplorersList,
  BlockExplorer,
  isValidUrl,
  normalizeUrl,
  BLOCK_EXPLORERS,
  removeBlockExplorer,
  removeTestnetBlockExplorer,
} from '../../models/blockExplorer';
import presentAlert from '../../components/Alert';
import Icon from '../../components/Icon';
import {
  SettingsButton,
  SettingsCard,
  SettingsIconCircle,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegmented,
  SettingsSwitchRow,
  useSettingsPalette,
  type SettingsSegment,
} from '../../components/settings/SettingsUI';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

type CustomBlockExplorerTarget = 'mainnet' | 'testnet';

const TARGETS: SettingsSegment<CustomBlockExplorerTarget>[] = [
  { value: 'mainnet', label: loc.wallets.neurai_network_mainnet, icon: 'public', testID: 'BlockExplorerCustomMainnet' },
  { value: 'testnet', label: loc.wallets.neurai_network_testnet, icon: 'science', testID: 'BlockExplorerCustomTestnet' },
];

const inferInitialCustomTarget = (mainnet: BlockExplorer, testnet: BlockExplorer): CustomBlockExplorerTarget => {
  if (mainnet.key === 'custom') return 'mainnet';
  if (testnet.key === 'custom') return 'testnet';
  return 'mainnet';
};

const SettingsBlockExplorer: React.FC = () => {
  const { selectedBlockExplorer, setBlockExplorerStorage, selectedTestnetBlockExplorer, setTestnetBlockExplorerStorage } = useSettings();
  const customUrlInputRef = useRef<TextInput>(null);
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();

  const [customTarget, setCustomTarget] = useState<CustomBlockExplorerTarget>(() =>
    inferInitialCustomTarget(selectedBlockExplorer, selectedTestnetBlockExplorer),
  );
  const [customUrl, setCustomUrl] = useState<string>(() =>
    selectedBlockExplorer.key === 'custom'
      ? selectedBlockExplorer.url
      : selectedTestnetBlockExplorer.key === 'custom'
        ? selectedTestnetBlockExplorer.url
        : '',
  );
  const [isCustomEnabled, setIsCustomEnabled] = useState<boolean>(
    () => selectedBlockExplorer.key === 'custom' || selectedTestnetBlockExplorer.key === 'custom',
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const predefinedExplorers = getBlockExplorersList().filter(explorer => explorer.key !== 'custom');
  const mainnetExplorers = predefinedExplorers.filter(e => e.key !== 'testnet');
  const testnetExplorers = predefinedExplorers.filter(e => e.key === 'testnet');

  const isMainnetCustomActive = isCustomEnabled && customTarget === 'mainnet';
  const isTestnetCustomActive = isCustomEnabled && customTarget === 'testnet';

  const handleMainnetExplorerPress = useCallback(
    async (explorer: BlockExplorer) => {
      const success = await setBlockExplorerStorage(explorer);
      if (success) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        if (customTarget === 'mainnet') setIsCustomEnabled(false);
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.block_explorer_error_saving_custom });
      }
    },
    [setBlockExplorerStorage, customTarget],
  );

  const handleTestnetExplorerPress = useCallback(
    async (explorer: BlockExplorer) => {
      const success = await setTestnetBlockExplorerStorage(explorer);
      if (success) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        if (customTarget === 'testnet') setIsCustomEnabled(false);
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.block_explorer_error_saving_custom });
      }
    },
    [setTestnetBlockExplorerStorage, customTarget],
  );

  const handleCustomUrlChange = useCallback((url: string) => {
    setCustomUrl(url);
  }, []);

  const handleSubmitCustomUrl = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const customUrlNormalized = normalizeUrl(customUrl);

    if (!isValidUrl(customUrlNormalized)) {
      presentAlert({ tone: 'warning', message: loc.settings.block_explorer_invalid_custom_url });
      customUrlInputRef.current?.focus();
      setIsSubmitting(false);
      return;
    }

    const customExplorer: BlockExplorer = { key: 'custom', name: 'Custom', url: customUrlNormalized };
    const setter = customTarget === 'mainnet' ? setBlockExplorerStorage : setTestnetBlockExplorerStorage;
    const success = await setter(customExplorer);

    if (success) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentAlert({ tone: 'success', message: loc.settings.saved });
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ tone: 'error', message: loc.settings.block_explorer_error_saving_custom });
    }
    setIsSubmitting(false);
  }, [customUrl, customTarget, setBlockExplorerStorage, setTestnetBlockExplorerStorage, isSubmitting]);

  const restoreTargetDefault = useCallback(
    async (target: CustomBlockExplorerTarget) => {
      if (target === 'mainnet') {
        await removeBlockExplorer();
        return setBlockExplorerStorage(BLOCK_EXPLORERS.default);
      }
      await removeTestnetBlockExplorer();
      return setTestnetBlockExplorerStorage(BLOCK_EXPLORERS.testnet);
    },
    [setBlockExplorerStorage, setTestnetBlockExplorerStorage],
  );

  const handleCustomSwitchToggle = useCallback(
    async (value: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsCustomEnabled(value);
      if (value) {
        customUrlInputRef.current?.focus();
      } else {
        const success = await restoreTargetDefault(customTarget);
        if (success) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        } else {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          if (!isSubmitting) {
            presentAlert({ message: loc.settings.block_explorer_error_saving_custom });
          }
        }
      }
    },
    [restoreTargetDefault, customTarget, isSubmitting],
  );

  const handleTargetChange = useCallback(
    async (next: CustomBlockExplorerTarget) => {
      if (next === customTarget) return;
      const previous = customTarget;
      setCustomTarget(next);
      // If the previous target had a custom URL active, restore its default so
      // we don't leave a stale custom preference on a network the user is no
      // longer pointing at.
      if (isCustomEnabled) await restoreTargetDefault(previous);
    },
    [customTarget, isCustomEnabled, restoreTargetDefault],
  );

  useEffect(() => {
    return () => {
      if (isCustomEnabled) {
        const customUrlNormalized = normalizeUrl(customUrl);
        if (!isValidUrl(customUrlNormalized)) {
          (async () => {
            const success = await restoreTargetDefault(customTarget);
            if (!success) {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ message: loc.settings.block_explorer_error_saving_custom });
            }
          })();
        }
      }
    };
  }, [customUrl, isCustomEnabled, customTarget, restoreTargetDefault]);

  /** One explorer to choose: a radio row with its name and address. Dimmed while the network uses the user's own. */
  const renderExplorerRow = (
    explorer: BlockExplorer,
    index: number,
    selected: BlockExplorer,
    onPress: (e: BlockExplorer) => void,
    rowDisabled: boolean,
  ) => {
    const isSelected = !rowDisabled && normalizeUrl(selected.url || '') === normalizeUrl(explorer.url || '');
    return (
      <Pressable
        key={explorer.key}
        onPress={() => onPress(explorer)}
        disabled={rowDisabled || isSelected}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected, disabled: rowDisabled }}
        accessibilityLabel={`${explorer.name}, ${explorer.url}`}
        testID={`BlockExplorer-${explorer.key}`}
        style={({ pressed }) => [
          styles.row,
          index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
          rowDisabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <SettingsIconCircle icon="travel-explore" muted={!isSelected} />
        <View style={styles.texts}>
          <Text style={[styles.rowTitle, { color: isSelected ? p.accentText : p.ink }]} numberOfLines={1}>
            {explorer.name}
          </Text>
          <Text style={[styles.rowSubtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
            {explorer.url}
          </Text>
        </View>
        {isSelected ? <Icon name="check" type="material" size={22} color={p.accentText} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.settings.block_explorer} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View>
          <SettingsSectionLabel>{loc.wallets.neurai_network_mainnet}</SettingsSectionLabel>
          <SettingsCard>
            {mainnetExplorers.map((explorer, index) =>
              renderExplorerRow(explorer, index, selectedBlockExplorer, handleMainnetExplorerPress, isMainnetCustomActive),
            )}
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.wallets.neurai_network_testnet}</SettingsSectionLabel>
          <SettingsCard>
            {testnetExplorers.map((explorer, index) =>
              renderExplorerRow(explorer, index, selectedTestnetBlockExplorer, handleTestnetExplorerPress, isTestnetCustomActive),
            )}
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.wallets.details_advanced}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsSwitchRow
              icon="link"
              title={loc.settings.block_explorer_preferred}
              subtitle={loc.settings.block_explorer_custom_subtitle}
              value={isCustomEnabled}
              onValueChange={handleCustomSwitchToggle}
              testID="BlockExplorerCustom"
              switchTestID="BlockExplorerCustomSwitch"
            />
            {isCustomEnabled ? (
              <View style={[styles.custom, { borderTopColor: p.divider }]}>
                <SettingsSegmented
                  segments={TARGETS}
                  value={customTarget}
                  onChange={handleTargetChange}
                  testID="BlockExplorerCustomTarget"
                />
                <View style={[styles.field, { backgroundColor: p.ground }]}>
                  <Icon name="language" type="material" size={20} color={p.mutedOnCard} />
                  <TextInput
                    ref={customUrlInputRef}
                    value={customUrl}
                    placeholder={loc._.enter_url}
                    onChangeText={handleCustomUrlChange}
                    onSubmitEditing={handleSubmitCustomUrl}
                    style={[styles.input, { color: p.ink }]}
                    placeholderTextColor={p.mutedOnCard}
                    textContentType="URL"
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    underlineColorAndroid="transparent"
                    testID="BlockExplorerCustomUrl"
                  />
                </View>
                <SettingsButton
                  title={loc.settings.save}
                  icon="check"
                  onPress={handleSubmitCustomUrl}
                  loading={isSubmitting}
                  disabled={customUrl.trim().length === 0}
                  testID="BlockExplorerCustomSave"
                />
              </View>
            ) : null}
          </SettingsCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  texts: { flex: 1, rowGap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13 },
  custom: { rowGap: 12, paddingTop: 14, paddingBottom: 6, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  field: { flexDirection: 'row', alignItems: 'center', columnGap: 10, height: 50, borderRadius: 16, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});

export default SettingsBlockExplorer;
