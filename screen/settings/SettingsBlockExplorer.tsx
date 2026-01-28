import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TextInput, SectionListRenderItemInfo, SectionListData, LayoutAnimation, View } from 'react-native';
import loc from '../../loc';
import { SettingsListItem, SettingsSectionHeader, isAndroid } from '../../components/platform';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';
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

type BlockExplorerItem = BlockExplorer | string;

interface SectionData extends SectionListData<BlockExplorerItem> {
  title?: string;
  data: BlockExplorerItem[];
}

const SettingsBlockExplorer: React.FC = () => {
  const { selectedBlockExplorer, setBlockExplorerStorage } = useSettings();
  const customUrlInputRef = useRef<TextInput>(null);
  const [customUrl, setCustomUrl] = useState<string>(selectedBlockExplorer.key === 'custom' ? selectedBlockExplorer.url : '');
  const [isCustomEnabled, setIsCustomEnabled] = useState<boolean>(selectedBlockExplorer.key === 'custom');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const horizontalPadding = isAndroid ? 20 : 16;
  const predefinedExplorers = getBlockExplorersList().filter(explorer => explorer.key !== 'custom');

  const sections: SectionData[] = [
    {
      key: 'suggested',
      title: loc._.suggested,
      data: predefinedExplorers,
    },
    {
      key: 'advanced',
      title: loc.wallets.details_advanced,
      data: ['custom'],
    },
  ];

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

  const renderItem = useCallback(
    ({ item, section, index }: SectionListRenderItemInfo<BlockExplorerItem, SectionData>) => {
      if (section.title === loc._.suggested) {
        const explorer = item as BlockExplorer;
        const isSelected = !isCustomEnabled && normalizeUrl(selectedBlockExplorer.url || '') === normalizeUrl(explorer.url || '');
        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;
        const rowPadding = !isAndroid ? { paddingHorizontal: horizontalPadding } : undefined;
        return (
          <View style={rowPadding}>
            <SettingsListItem
              title={explorer.name}
              onPress={() => handleExplorerPress(explorer)}
              checkmark={isSelected}
              disabled={isCustomEnabled}
              position={isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle'}
            />
          </View>
        );
      }

      return (
        <SettingsBlockExplorerCustomUrlItem
          isCustomEnabled={isCustomEnabled}
          onSwitchToggle={handleCustomSwitchToggle}
          customUrl={customUrl}
          onCustomUrlChange={handleCustomUrlChange}
          onSubmitCustomUrl={handleSubmitCustomUrl}
          inputRef={customUrlInputRef}
        />
      );
    },
    [
      selectedBlockExplorer,
      isCustomEnabled,
      handleExplorerPress,
      handleCustomSwitchToggle,
      customUrl,
      handleCustomUrlChange,
      handleSubmitCustomUrl,
      horizontalPadding,
    ],
  );

  const renderSectionHeader = useCallback((info: { section: SectionData }) => {
    if (info.section.title) {
      return <SettingsSectionHeader title={info.section.title} />;
    }
    return null;
  }, []);

  return (
    <SafeAreaSectionList<BlockExplorerItem, SectionData>
      sections={sections}
      keyExtractor={(item: BlockExplorerItem, index: number) => (typeof item === 'string' ? `custom-${index}` : `explorer-${item.key}`)}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

export default SettingsBlockExplorer;
