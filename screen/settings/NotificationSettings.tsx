import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Linking, ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Button as ButtonRNElements } from '@rneui/themed';
// @ts-ignore: no declaration file
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
} from '../../blue_modules/notifications';
import { BlueCard, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { Button } from '../../components/Button';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { Divider } from '@rneui/base';
import { openSettings } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabledState, setNotificationsEnabledState] = useState(false);
  const [tokenInfo, setTokenInfo] = useState('<empty>');
  const [URI, setURI] = useState<string | undefined>();
  const [tapCount, setTapCount] = useState(0);
  const { colors } = useTheme();
  const stylesWithThemeHook = {
    root: {
      backgroundColor: colors.background,
    },
    scroll: {
      backgroundColor: colors.background,
    },
    scrollBody: {
      backgroundColor: colors.background,
    },
    uri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  };

  const handleTap = () => {
    setTapCount(prevCount => prevCount + 1);
  };

  const onNotificationsSwitch = async (value: boolean) => {
    try {
      setNotificationsEnabledState(value);
      if (value) {
        // User is enabling notifications
        await cleanUserOptOutFlag();
        if (await getPushToken()) {
          // we already have a token, so we just need to reenable ALL level on groundcontrol:
          await setLevels(true);
        } else {
          // ok, we dont have a token. we need to try to obtain permissions, configure callbacks and save token locally:
          await tryToObtainPermissions();
        }
      } else {
        // User is disabling notifications
        await setLevels(false);
        console.debug('Abandoning notifications Permissions...');
        PushNotification.abandonPermissions();
        console.debug('Abandoned notifications Permissions...');
      }

      setNotificationsEnabledState(await isNotificationsEnabled());
    } catch (error) {
      console.error(error);
      presentAlert({ message: (error as Error).message });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setNotificationsEnabledState(await isNotificationsEnabled());
        setURI((await getSavedUri()) ?? getDefaultUri());
        // @ts-ignore: refactor later
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
  }, []);

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (URI) {
        // validating only if its not empty. empty means use default
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
      console.warn(error);
    }
    setIsLoading(false);
  }, [URI]);

  const onSystemSettings = () => {
    openSettings('notifications');
  };

  return (
    <ScrollView style={stylesWithThemeHook.scroll} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.notifications}
        subtitle={loc.notifications.notifications_subtitle}
        disabled={isLoading}
        switch={{ onValueChange: onNotificationsSwitch, value: isNotificationsEnabledState, testID: 'NotificationsSwitch' }}
      />

      <Pressable onPress={handleTap}>
        <BlueCard>
          <BlueText style={styles.multilineText}>{loc.settings.push_notifications_explanation}</BlueText>
        </BlueCard>
      </Pressable>

      {tapCount >= 10 && (
        <>
          <Divider />
          <BlueCard>
            <BlueText>{loc.settings.groundcontrol_explanation}</BlueText>
          </BlueCard>

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

          <BlueCard>
            <View style={[styles.uri, stylesWithThemeHook.uri]}>
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
            <BlueText style={styles.centered} onPress={() => setTapCount(tapCount + 1)}>
              ♪ Ground Control to Major Tom ♪
            </BlueText>
            <BlueText style={styles.centered} onPress={() => setTapCount(tapCount + 1)}>
              ♪ Commencing countdown, engines on ♪
            </BlueText>

            <View>
              <CopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
            </View>

            <BlueSpacing20 />
            <Button onPress={save} title={loc.settings.save} />
          </BlueCard>
        </>
      )}
      <BlueSpacing40 />
      <ListItem title={loc.settings.privacy_system_settings} onPress={onSystemSettings} chevron />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  uri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  centered: {
    textAlign: 'center',
  },
  uriText: {
    flex: 1,
    color: '#81868e',
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
  buttonStyle: {
    backgroundColor: 'transparent',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  multilineText: {
    textAlign: 'left',
    lineHeight: 20,
    paddingBottom: 10,
  },
});

export default NotificationSettings;
