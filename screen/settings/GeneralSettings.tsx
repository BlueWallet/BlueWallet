import React, { useCallback } from 'react';
import { Platform, StyleSheet, View, ListRenderItem } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
// Update to use new theme directory
import { usePlatformTheme } from '../../theme';

interface SettingItem {
  id: string;
  title: string;
  onPress?: () => void;
  testID?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  subtitle?: string;
  showItem: boolean;
  Component?: React.ElementType;
}

const GeneralSettings: React.FC = () => {
  const { wallets } = useStorage();
  const { isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage, isLegacyURv1Enabled, setIsLegacyURv1EnabledStorage } = useSettings();
  const { navigate } = useNavigation();
  const { colors } = usePlatformTheme();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: 16,
    },
  });

  const navigateToPrivacy = useCallback(() => {
    navigate('SettingsPrivacy' as never);
  }, [navigate]);

  const navigateToDefaultView = useCallback(() => {
    navigate('DefaultView' as never);
  }, [navigate]);

  const onHandOffUseEnabledChange = useCallback(
    async (value: boolean) => {
      await setIsHandOffUseEnabledAsyncStorage(value);
    },
    [setIsHandOffUseEnabledAsyncStorage],
  );

  const settingsItems = useCallback(() => {
    const items: SettingItem[] = [
      {
        id: 'defaultView',
        title: loc.settings.default_title,
        onPress: navigateToDefaultView,
        showItem: wallets.length > 0,
      },
      {
        id: 'privacy',
        title: loc.settings.privacy,
        onPress: navigateToPrivacy,
        testID: 'SettingsPrivacy',
        showItem: true,
      },
      {
        id: 'continuity',
        title: loc.settings.general_continuity,
        subtitle: loc.settings.general_continuity_e,
        isSwitch: true,
        switchValue: isHandOffUseEnabled,
        onSwitchValueChange: onHandOffUseEnabledChange,
        Component: View,
        showItem: Platform.OS === 'ios',
      },
      {
        id: 'legacyURv1',
        title: 'Legacy URv1 QR',
        isSwitch: true,
        switchValue: isLegacyURv1Enabled,
        Component: View,
        onSwitchValueChange: setIsLegacyURv1EnabledStorage,
        showItem: true,
      },
    ];

    return items.filter(item => item.showItem);
  }, [
    wallets.length,
    navigateToDefaultView,
    navigateToPrivacy,
    isHandOffUseEnabled,
    onHandOffUseEnabledChange,
    isLegacyURv1Enabled,
    setIsLegacyURv1EnabledStorage,
  ]);

  const renderItem: ListRenderItem<SettingItem> = useCallback(
    ({ item, index }) => {
      const items = settingsItems();
      const isFirst = index === 0;
      const isLast = index === items.length - 1;

      if (item.isSwitch) {
        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={styles.listItemContainer}
            isFirst={isFirst}
            isLast={isLast}
            Component={item.Component}
            bottomDivider={layout.showBorderBottom && !isLast}
            switch={{
              value: item.switchValue || false,
              onValueChange: item.onSwitchValueChange,
            }}
          />
        );
      }

      return (
        <PlatformListItem
          title={item.title}
          containerStyle={styles.listItemContainer}
          onPress={item.onPress}
          testID={item.testID}
          chevron
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
        />
      );
    },
    [layout.showBorderBottom, styles.listItemContainer, settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default GeneralSettings;
