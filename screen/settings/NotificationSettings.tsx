import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View, Pressable, AppState, Text } from 'react-native';
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
import {
  SettingsCard,
  SettingsFlatList,
  SettingsListItem,
  SettingsListItemProps,
  SettingsSubtitle,
  isAndroid,
} from '../../components/platform';

interface SettingItem extends SettingsListItemProps {
  id: string;
  section?: number;
  customContent?: React.ReactNode;
}

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabledState, setNotificationsEnabledState] = useState<boolean | undefined>(undefined);

  const [tokenInfo, setTokenInfo] = useState('<empty>');
  const [URI, setURI] = useState<string | undefined>();
  const [tapCount, setTapCount] = useState(0);
  const { colors } = useTheme();

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
        <View style={[styles.divider, { backgroundColor: colors.lightBorder ?? colors.borderTopColor }]} />
        <SettingsCard style={styles.card}>
          <View style={styles.cardContent}>
            <Pressable onPress={handleTap}>
              <Text style={[styles.multilineText, { color: colors.foregroundColor }]}>{loc.settings.groundcontrol_explanation}</Text>
            </Pressable>
          </View>
        </SettingsCard>

        <SettingsListItem
          title="github.com/BlueWallet/GroundControl"
          iconName="github"
          onPress={() => Linking.openURL('https://github.com/BlueWallet/GroundControl')}
          chevron
          position="single"
          spacingTop
        />

        <SettingsCard style={styles.card}>
          <View style={styles.cardContent}>
            <View
              style={[
                styles.uri,
                { borderColor: colors.formBorder, borderBottomColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor },
              ]}
            >
              <TextInput
                placeholder={getDefaultUri()}
                value={URI}
                onChangeText={setURI}
                numberOfLines={1}
                style={[styles.uriText, { color: colors.alternativeTextColor }]}
                placeholderTextColor="#81868e"
                editable={!isLoading}
                textContentType="URL"
                autoCapitalize="none"
                underlineColorAndroid="transparent"
              />
            </View>

            <BlueSpacing20 />
            <Text style={[styles.centered, { color: colors.foregroundColor }]} onPress={() => setTapCount(tapCount + 1)}>
              ♪ Ground Control to Major Tom ♪
            </Text>
            <Text style={[styles.centered, { color: colors.foregroundColor }]} onPress={() => setTapCount(tapCount + 1)}>
              ♪ Commencing countdown, engines on ♪
            </Text>

            <View>
              <CopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
            </View>

            <BlueSpacing20 />
            <Button onPress={save} title={loc.settings.save} />
          </View>
        </SettingsCard>
      </View>
    );
  }, [tapCount, colors, isLoading, URI, tokenInfo, save]);

  const settingsItems = useCallback((): SettingItem[] => {
    const items: SettingItem[] = [
      {
        id: 'notificationsToggle',
        title: loc.settings.notifications,
        subtitle: loc.notifications.notifications_subtitle,
        switch: {
          value: isNotificationsEnabledState || false,
          onValueChange: onNotificationsSwitch,
          disabled: isLoading,
        },
        isLoading: isNotificationsEnabledState === undefined,
        testID: 'NotificationsSwitch',
        Component: View,
        section: 1,
      },
      {
        id: 'notificationsExplanation',
        title: '',
        customContent: (
          <SettingsCard compact style={!isAndroid ? styles.cardNoRadius : undefined}>
            <View style={styles.cardContent}>
              <SettingsSubtitle>{loc.settings.push_notifications_explanation}</SettingsSubtitle>
            </View>
          </SettingsCard>
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
  }, [isNotificationsEnabledState, onNotificationsSwitch, isLoading, renderDeveloperSettings, onSystemSettings]);

  const renderItem = useCallback(
    (props: { item: SettingItem }) => {
      const { id, section, customContent, ...listItemProps } = props.item;
      const items = settingsItems();
      const contentPadding = !isAndroid ? { paddingHorizontal: horizontalPadding } : undefined;

      if (customContent) {
        return <View style={contentPadding}>{customContent}</View>;
      }

      const sectionItems = items.filter(i => i.section === section && !i.customContent);
      const indexInSection = sectionItems.findIndex(i => i.id === id);
      const isFirstInSection = indexInSection === 0;
      const isLastInSection = indexInSection === sectionItems.length - 1;
      const position = isFirstInSection && isLastInSection ? 'single' : isFirstInSection ? 'first' : isLastInSection ? 'last' : 'middle';

      return <SettingsListItem {...listItemProps} position={position} />;
    },
    [settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  return (
    <SettingsFlatList
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default NotificationSettings;

const horizontalPadding = isAndroid ? 20 : 16;

const styles = StyleSheet.create({
  card: {
    marginVertical: isAndroid ? 8 : 0,
  },
  cardNoRadius: {
    borderRadius: 0,
  },
  cardContent: {
    paddingHorizontal: horizontalPadding,
    paddingVertical: isAndroid ? 12 : 10,
  },
  multilineText: {
    lineHeight: 20,
    paddingBottom: 10,
  },
  centered: {
    textAlign: 'center',
    marginVertical: 4,
  },
  uri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
  },
  uriText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
  divider: {
    marginVertical: isAndroid ? 16 : 12,
    height: 0.5,
  },
  sectionSpacing: {
    height: isAndroid ? 24 : 12,
  },
});
