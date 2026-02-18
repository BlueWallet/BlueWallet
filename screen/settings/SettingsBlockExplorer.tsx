import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TextInput, LayoutAnimation } from 'react-native';
import loc from '../../loc';
import { SettingsScrollView, SettingsSection, SettingsListItem, SettingsSectionHeader } from '../../components/platform';
import {
  getBlockExplorersList,
  BlockExplorer,
  isValidUrl,
  normalizeUrl,
  BLOCK_EXPLORERS,
  removeBlockExplorer,
} from '../../models/blockExplorer';
import presentAlert from '../../components/Alert';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useSettings } from '../../hooks/context/useSettings';
import SettingsBlockExplorerCustomUrlItem from '../../components/SettingsBlockExplorerCustomUrlListItem';

const SettingsBlockExplorer: React.FC = () => {
  const { selectedBlockExplorer, setBlockExplorerStorage } = useSettings();
  const customUrlInputRef = useRef<TextInput>(null);
  const [customUrl, setCustomUrl] = useState<string>(selectedBlockExplorer.key === 'custom' ? selectedBlockExplorer.url : '');
  const [isCustomEnabled, setIsCustomEnabled] = useState<boolean>(selectedBlockExplorer.key === 'custom');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const predefinedExplorers = getBlockExplorersList().filter(explorer => explorer.key !== 'custom');

  const handleExplorerPress = useCallback(
    async (explorer: BlockExplorer) => {
      const success = await setBlockExplorerStorage(explorer);
      if (success) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        setIsCustomEnabled(false);
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({
          message: loc.settings.block_explorer_error_saving_custom,
        });
      }
    },
    [setBlockExplorerStorage],
  );

  const handleCustomUrlChange = useCallback((url: string) => {
    setCustomUrl(url);
  }, []);

  const handleSubmitCustomUrl = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const customUrlNormalized = normalizeUrl(customUrl);

    if (!isValidUrl(customUrlNormalized)) {
      presentAlert({ message: loc.settings.block_explorer_invalid_custom_url });
      customUrlInputRef.current?.focus();
      setIsSubmitting(false);
      return;
    }

    const customExplorer: BlockExplorer = {
      key: 'custom',
      name: 'Custom',
      url: customUrlNormalized,
    };

    const success = await setBlockExplorerStorage(customExplorer);

    if (success) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({
        message: loc.settings.block_explorer_error_saving_custom,
      });
    }
    setIsSubmitting(false);
  }, [customUrl, setBlockExplorerStorage, isSubmitting]);

  const handleCustomSwitchToggle = useCallback(
    async (value: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsCustomEnabled(value);
      if (value) {
        await removeBlockExplorer();
        customUrlInputRef.current?.focus();
      } else {
        const defaultExplorer = BLOCK_EXPLORERS.default;
        const success = await setBlockExplorerStorage(defaultExplorer);
        if (success) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        } else {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          if (!isSubmitting) {
            presentAlert({
              message: loc.settings.block_explorer_error_saving_custom,
            });
          }
        }
      }
    },
    [setBlockExplorerStorage, isSubmitting],
  );

  useEffect(() => {
    return () => {
      if (isCustomEnabled) {
        const customUrlNormalized = normalizeUrl(customUrl);
        if (!isValidUrl(customUrlNormalized)) {
          (async () => {
            const success = await setBlockExplorerStorage(BLOCK_EXPLORERS.default);
            if (!success) {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({
                message: loc.settings.block_explorer_error_saving_custom,
              });
            }
          })();
        }
      }
    };
  }, [customUrl, isCustomEnabled, setBlockExplorerStorage]);

  return (
    <SettingsScrollView>
      <SettingsSectionHeader title={loc._.suggested} />
      <SettingsSection horizontalInset={false}>
        {predefinedExplorers.map((explorer, index) => {
          const isSelected = !isCustomEnabled && normalizeUrl(selectedBlockExplorer.url || '') === normalizeUrl(explorer.url || '');
          const isFirst = index === 0;
          const isLast = index === predefinedExplorers.length - 1;

          return (
            <SettingsListItem
              key={explorer.key}
              title={explorer.name}
              onPress={() => handleExplorerPress(explorer)}
              checkmark={isSelected}
              disabled={isCustomEnabled}
              position={isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle'}
            />
          );
        })}
      </SettingsSection>

      <SettingsSectionHeader title={loc.wallets.details_advanced} />
      <SettingsSection compact horizontalInset={false}>
        <SettingsBlockExplorerCustomUrlItem
          isCustomEnabled={isCustomEnabled}
          onSwitchToggle={handleCustomSwitchToggle}
          customUrl={customUrl}
          onCustomUrlChange={handleCustomUrlChange}
          onSubmitCustomUrl={handleSubmitCustomUrl}
          inputRef={customUrlInputRef}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default SettingsBlockExplorer;
