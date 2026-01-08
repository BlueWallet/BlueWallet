import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  TextInput,
  SectionListRenderItemInfo,
  SectionListData,
  View,
  LayoutAnimation,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListItem from '../../components/ListItem';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import { usePlatformStyles } from '../../theme/platformStyles';
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
import { Header } from '../../components/Header';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';

type BlockExplorerItem = BlockExplorer | string;

interface SectionData extends SectionListData<BlockExplorerItem> {
  title?: string;
  data: BlockExplorerItem[];
}

const SettingsBlockExplorer: React.FC = () => {
  const { colors } = useTheme();
  const { selectedBlockExplorer, setBlockExplorerStorage } = useSettings();
  const { sizing } = usePlatformStyles();
  const customUrlInputRef = useRef<TextInput>(null);
  const [customUrl, setCustomUrl] = useState<string>(selectedBlockExplorer.key === 'custom' ? selectedBlockExplorer.url : '');
  const [isCustomEnabled, setIsCustomEnabled] = useState<boolean>(selectedBlockExplorer.key === 'custom');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // Standard Android header is 56dp + status bar height
  // For older Android versions, use a fallback if StatusBar.currentHeight is not available
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

  const predefinedExplorers = getBlockExplorersList().filter(explorer => explorer.key !== 'custom');

  const sections: SectionData[] = [
    {
      title: loc._.suggested,
      data: predefinedExplorers,
    },
    {
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
    ({ item, section }: SectionListRenderItemInfo<BlockExplorerItem, SectionData>) => {
      if (section.title === loc._.suggested) {
        const explorer = item as BlockExplorer;
        const isSelected = !isCustomEnabled && normalizeUrl(selectedBlockExplorer.url || '') === normalizeUrl(explorer.url || '');
        return (
          <ListItem
            title={explorer.name}
            onPress={() => handleExplorerPress(explorer)}
            checkmark={isSelected}
            disabled={isCustomEnabled}
            containerStyle={[{ backgroundColor: colors.background }, styles.rowHeight]}
          />
        );
      } else {
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
      }
    },
    [
      selectedBlockExplorer,
      isCustomEnabled,
      handleExplorerPress,
      colors.background,
      handleCustomSwitchToggle,
      customUrl,
      handleCustomUrlChange,
      handleSubmitCustomUrl,
    ],
  );

  // @ts-ignore: renderSectionHeader type is not correct
  const renderSectionHeader = useCallback(({ section }) => {
    const { title } = section;
    if (title) {
      return (
        <View style={styles.container}>
          <Header leftText={title} />
        </View>
      );
    }
    return null;
  }, []);

  return (
    <SafeAreaSectionList<BlockExplorerItem, SectionData>
      sections={sections}
      keyExtractor={(item, index) => {
        if (typeof item === 'string') {
          return `custom-${index}`;
        } else {
          return item.key;
        }
      }}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      contentContainerStyle={{
        paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
      }}
      style={[styles.root, { backgroundColor: colors.background }]}
      stickySectionHeadersEnabled={false}
      headerHeight={headerHeight}
    />
  );
};

export default SettingsBlockExplorer;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    paddingTop: 24,
  },
  rowHeight: {
    minHeight: 60,
  },
});
