import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { I18nManager, Linking, StyleSheet, TextInput, View, Pressable, AppState, Text, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button as ButtonRNElements } from '@rneui/themed';
import {
  getDefaultUri,
  getPushToken,
  getSavedUri,
  getStoredNotifications,
  saveUri,
  isNotificationsEnabled,
  setLevels,
  tryToObtainPermissions,
  cleanUserOptOutFlag,
  isGroundControlUriValid,
  checkPermissions,
  checkNotificationPermissionStatus,
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG,
} from '../../blue_modules/notifications';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import presentAlert from '../../components/Alert';
import { Button } from '../../components/Button';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { openSettings } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { usePlatformStyles } from '../../theme/platformStyles';
import PlatformListItem from '../../components/PlatformListItem';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  switchDisabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  testID?: string;
  chevron?: boolean;
  Component?: React.ElementType;
  customContent?: React.ReactNode;
  section?: number;
}

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabledState, setNotificationsEnabledState] = useState<boolean | undefined>(undefined);
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
  const [tokenInfo, setTokenInfo] = useState('<empty>');
  const [URI, setURI] = useState<string | undefined>();
  const [tapCount, setTapCount] = useState(0);
  const { colors } = useTheme();
  const { colors: platformColors, sizing, layout } = usePlatformStyles();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius,
      padding: 16,
      marginVertical: 8,
    },
    multilineText: {
      color: platformColors.titleColor,
      lineHeight: 20,
      paddingBottom: 10,
    },
    centered: {
      textAlign: 'center',
      color: platformColors.titleColor,
      marginVertical: 4,
    },
    uri: {
      flexDirection: 'row',
      borderWidth: 1,
      borderBottomWidth: 0.5,
      minHeight: 44,
      height: 44,
      alignItems: 'center',
      borderRadius: 4,
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    uriText: {
      flex: 1,
      color: platformColors.subtitleColor,
      marginHorizontal: 8,
      minHeight: 36,
      height: 36,
    },
    buttonStyle: {
      backgroundColor: 'transparent',
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    },
    divider: {
      marginVertical: 16,
      height: 0.5,
      backgroundColor: platformColors.separatorColor,
    },
    sectionSpacing: {
      height: 24,
    },

    explanationContainer: {
      paddingTop: 12,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: platformColors.separatorColor,
      backgroundColor: platformColors.cardBackground,
      borderBottomLeftRadius: sizing.containerBorderRadius,
      borderBottomRightRadius: sizing.containerBorderRadius,
    },
    explanationText: {
      color: platformColors.subtitleColor,
      fontSize: sizing.subtitleFontSize,
      lineHeight: 20,
      paddingBottom: 16,
    },
  });

  const handleTap = () => {
    setTapCount(prevCount => prevCount + 1);
  };

  const onSystemSettings = useCallback(() => {
    openSettings('notifications');
  }, []);

  const showNotificationPermissionAlert = useCallback(() => {
    presentAlert({
      title: loc.settings.notifications,
      message: loc.notifications.permission_denied_message,
      buttons: [
        {
          text: loc._.ok,
          style: 'cancel',
        },
        {
          text: loc.settings.header,
          onPress: onSystemSettings,
          style: 'default',
        },
      ],
    });
  }, [onSystemSettings]);

  const onNotificationsSwitch = useCallback(
    async (value: boolean) => {
      if (value) {
        const currentStatus = await checkNotificationPermissionStatus();
        if (currentStatus === 'blocked') {
          // If permissions are denied/blocked, show alert and reset the toggle
          showNotificationPermissionAlert();
          setNotificationsEnabledState(false);
          return;
        }
      }

      try {
        setNotificationsEnabledState(value);
        if (value) {
          await cleanUserOptOutFlag();
          const permissionsGranted = await tryToObtainPermissions();
          if (permissionsGranted) {
            await setLevels(true);
            await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
          } else {
            showNotificationPermissionAlert();
            setNotificationsEnabledState(false);
          }
        } else {
          await setLevels(false);
          await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
          setNotificationsEnabledState(false);
        }

        setNotificationsEnabledState(await isNotificationsEnabled());
      } catch (error) {
        console.error(error);
        presentAlert({ message: (error as Error).message });
        setNotificationsEnabledState(false);
      }
    },
    [showNotificationPermissionAlert, setNotificationsEnabledState],
  );

  const updateNotificationStatus = async () => {
    try {
      const currentStatus = await checkNotificationPermissionStatus();
      const isEnabled = await isNotificationsEnabled();
      const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

      if (!isDisabledByUser) {
        setNotificationsEnabledState(currentStatus === 'granted' && isEnabled);
      } else {
        setNotificationsEnabledState(false);
      }
    } catch (error) {
      console.log('Error updating notification status:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

        if (isDisabledByUser) {
          console.debug('Notifications were disabled by the user. Skipping auto-activation.');
          setNotificationsEnabledState(false);
        } else {
          await updateNotificationStatus();
        }

        setURI((await getSavedUri()) ?? getDefaultUri());
        setTokenInfo(
          'token: ' +
            JSON.stringify(await getPushToken()) +
            ' permissions: ' +
            JSON.stringify(await checkPermissions()) +
            ' stored notifications: ' +
            JSON.stringify(await getStoredNotifications()),
        );
      } catch (e) {
        console.error(e);
        presentAlert({ message: (e as Error).message });
      } finally {
        setIsLoading(false);
      }
    })();

    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setTimeout(async () => {
          const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';
          if (!isDisabledByUser) {
            updateNotificationStatus();
          }
        }, 300);
      }
    });

    return () => {
      appStateListener.remove();
    };
  }, []);

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (URI) {
        if (await isGroundControlUriValid(URI)) {
          await saveUri(URI);
          presentAlert({ message: loc.settings.saved });
        } else {
          presentAlert({ message: loc.settings.not_a_valid_uri });
        }
      } else {
        await saveUri('');
        presentAlert({ message: loc.settings.saved });
      }
    } catch (error) {
      console.error('Error saving URI:', error);
    }
    setIsLoading(false);
  }, [URI]);

  const renderDeveloperSettings = useCallback(() => {
    if (tapCount < 10) return null;

    return (
      <View>
        <View style={styles.divider} />
        <View style={styles.card}>
          <Pressable onPress={handleTap}>
            <Text style={styles.multilineText}>{loc.settings.groundcontrol_explanation}</Text>
          </Pressable>
        </View>

        <ButtonRNElements
          icon={{
            name: 'github',
            type: 'font-awesome',
            color: colors.foregroundColor,
          }}
          onPress={() => Linking.openURL('https://github.com/BlueWallet/GroundControl')}
          titleStyle={{ color: colors.buttonAlternativeTextColor }}
          title="github.com/BlueWallet/GroundControl"
          color={colors.buttonTextColor}
          buttonStyle={styles.buttonStyle}
        />

        <View style={styles.card}>
          <View style={styles.uri}>
            <TextInput
              placeholder={getDefaultUri()}
              value={URI}
              onChangeText={setURI}
              numberOfLines={1}
              style={styles.uriText}
              placeholderTextColor="#81868e"
              editable={!isLoading}
              textContentType="URL"
              autoCapitalize="none"
              underlineColorAndroid="transparent"
            />
          </View>

          <BlueSpacing20 />
          <Text style={styles.centered} onPress={() => setTapCount(tapCount + 1)}>
            ♪ Ground Control to Major Tom ♪
          </Text>
          <Text style={styles.centered} onPress={() => setTapCount(tapCount + 1)}>
            ♪ Commencing countdown, engines on ♪
          </Text>

          <View>
            <CopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
          </View>

          <BlueSpacing20 />
          <Button onPress={save} title={loc.settings.save} />
        </View>
      </View>
    );
  }, [
    tapCount,
    colors.foregroundColor,
    colors.buttonAlternativeTextColor,
    colors.buttonTextColor,
    styles.divider,
    styles.card,
    styles.multilineText,
    styles.buttonStyle,
    styles.uri,
    styles.uriText,
    styles.centered,
    isLoading,
    URI,
    tokenInfo,
    save,
    setTapCount,
  ]);

  const settingsItems = useCallback((): SettingItem[] => {
    const items: SettingItem[] = [
      {
        id: 'notificationsToggle',
        title: loc.settings.notifications,
        subtitle: loc.notifications.notifications_subtitle,
        isSwitch: true,
        switchValue: isNotificationsEnabledState,
        onSwitchValueChange: onNotificationsSwitch,
        switchDisabled: isLoading,
        isLoading: isNotificationsEnabledState === undefined,
        testID: 'NotificationsSwitch',
        Component: View,
        section: 1,
      },
      {
        id: 'notificationsExplanation',
        title: '',
        customContent: (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationText}>{loc.settings.push_notifications_explanation}</Text>
          </View>
        ),
        section: 1,
      },
      {
        id: 'section1Spacing',
        title: '',
        customContent: <View style={styles.sectionSpacing} />,
        section: 1.5,
      },
      {
        id: 'developerSettings',
        title: '',
        customContent: renderDeveloperSettings(),
        section: 2,
      },
      {
        id: 'section2Spacing',
        title: '',
        customContent: <View style={styles.sectionSpacing} />,
        section: 2.5,
      },
      {
        id: 'privacySystemSettings',
        title: loc.settings.privacy_system_settings,
        onPress: onSystemSettings,
        chevron: true,
        section: 3,
      },
    ];

    return items.filter(item => item.title !== '' || item.customContent);
  }, [
    isNotificationsEnabledState,
    onNotificationsSwitch,
    isLoading,
    styles.explanationContainer,
    styles.explanationText,
    styles.sectionSpacing,
    renderDeveloperSettings,
    onSystemSettings,
  ]);

  const renderItem = useCallback(
    (props: { item: SettingItem }) => {
      const item = props.item;
      const items = settingsItems();

      if (item.customContent) {
        return <>{item.customContent}</>;
      }

      const isStandaloneItem = item.id === 'privacySystemSettings';

      const currentSectionItems = items.filter(i => i.section === item.section);
      const indexInSection = currentSectionItems.indexOf(item);
      const isFirstInSection = indexInSection === 0;

      if (item.isSwitch) {
        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={[
              styles.listItemContainer,
              layout.showBorderRadius && {
                borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
                borderTopRightRadius: sizing.containerBorderRadius * 1.5,
              },
            ]}
            Component={item.Component}
            switch={{
              value: item.switchValue || false,
              onValueChange: item.onSwitchValueChange,
              disabled: item.switchDisabled,
            }}
            isLoading={item.isLoading}
            testID={item.testID}
            isFirst={isFirstInSection}
            isLast={false}
            bottomDivider={false}
          />
        );
      }

      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={styles.listItemContainer}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          isFirst={isStandaloneItem}
          isLast={isStandaloneItem}
          bottomDivider={layout.showBorderBottom && !isStandaloneItem}
        />
      );
    },
    [styles.listItemContainer, layout.showBorderBottom, layout.showBorderRadius, settingsItems, sizing.containerBorderRadius],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      headerHeight={headerHeight}
      style={styles.container}
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default NotificationSettings;
