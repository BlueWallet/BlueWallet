import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Linking, ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Button as ButtonRNElements } from '@rneui/themed';
// @ts-ignore: no declaration file
import Notifications from '../../blue_modules/notifications';
import { BlueCard, BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { Button } from '../../components/Button';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { Divider } from '@rneui/base';

const NotificationSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
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
      setNotificationsEnabled(value);
      if (value) {
        // User is enabling notifications
        // @ts-ignore: refactor later
        await Notifications.cleanUserOptOutFlag();
        // @ts-ignore: refactor later
        if (await Notifications.getPushToken()) {
          // we already have a token, so we just need to reenable ALL level on groundcontrol:
          // @ts-ignore: refactor later
          await Notifications.setLevels(true);
        } else {
          // ok, we dont have a token. we need to try to obtain permissions, configure callbacks and save token locally:
          // @ts-ignore: refactor later
          await Notifications.tryToObtainPermissions();
        }
      } else {
        // User is disabling notifications
        // @ts-ignore: refactor later
        await Notifications.setLevels(false);
      }

      // @ts-ignore: refactor later
      setNotificationsEnabled(await Notifications.isNotificationsEnabled());
    } catch (error) {
      console.error(error);
      presentAlert({ message: (error as Error).message });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore: refactor later
        setNotificationsEnabled(await Notifications.isNotificationsEnabled());
        // @ts-ignore: refactor later
        setURI(await Notifications.getSavedUri());
        // @ts-ignore: refactor later
        setTokenInfo(
          'token: ' +
            // @ts-ignore: refactor later
            JSON.stringify(await Notifications.getPushToken()) +
            ' permissions: ' +
            // @ts-ignore: refactor later
            JSON.stringify(await Notifications.checkPermissions()) +
            ' stored notifications: ' +
            // @ts-ignore:  refactor later
            JSON.stringify(await Notifications.getStoredNotifications()),
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
        // @ts-ignore: refactor later
        if (await Notifications.isGroundControlUriValid(URI)) {
          // @ts-ignore: refactor later
          await Notifications.saveUri(URI);
          presentAlert({ message: loc.settings.saved });
        } else {
          presentAlert({ message: loc.settings.not_a_valid_uri });
        }
      } else {
        // @ts-ignore: refactor later
        await Notifications.saveUri('');
        presentAlert({ message: loc.settings.saved });
      }
    } catch (error) {
      console.warn(error);
    }
    setIsLoading(false);
  }, [URI]);

  return (
    <ScrollView style={stylesWithThemeHook.scroll} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.notifications}
        subtitle={loc.notifications.notifications_subtitle}
        disabled={isLoading}
        switch={{ onValueChange: onNotificationsSwitch, value: isNotificationsEnabled, testID: 'NotificationsSwitch' }}
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
                // @ts-ignore: refactor later
                placeholder={Notifications.getDefaultUri()}
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
