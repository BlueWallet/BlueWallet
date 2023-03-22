import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, I18nManager, Linking, StyleSheet, TextInput, TouchableWithoutFeedback, View, PermissionsAndroid } from 'react-native';
import { Button, Icon } from 'react-native-elements';

import { BlueButton, BlueCard, BlueListItem, BlueLoading, BlueSpacing20, BlueText, SafeBlueArea, BlueCopyToClipboardButton } from '../../BlueComponents';
import Notifications from '../../blue_modules/notifications';
import { AppStorage } from '../../class';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import alert from '../../components/Alert';
import navigationStyle, { NavigationOptionsGetter } from '../../components/navigationStyle';
import { useTheme } from '../../components/themes';
import loc from '../../loc';

const PushNotification = require('react-native-push-notification');

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
  centered: {
    textAlign: 'center',
  },
});

type LightingSettingsRouteProps = RouteProp<
  {
    params?: {
      url?: string;
    };
  },
  'params'
>;

const BolthubSettings: React.FC & { navigationOptions: NavigationOptionsGetter } = () => {
  const params = useRoute<LightingSettingsRouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  
  const [URI, setURI] = useState<string>();
  const [notificationURI, setNotificationURI] = useState<string>();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isShowTokenInfo, setShowTokenInfo] = useState(0);
  const [tokenInfo, setTokenInfo] = useState('<empty>');

  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const styleHook = StyleSheet.create({
    uri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  //notification useeffect
  useEffect(() => {
    (async () => {
      setNotificationsEnabled(await Notifications.isNotificationsEnabled());
      setNotificationURI(await Notifications.getSavedUri());
      console.log('saved uri', await Notifications.getSavedUri())
      setTokenInfo(
        'token: ' +
          JSON.stringify(await Notifications.getPushToken()) +
          ' permissions: ' +
          JSON.stringify(await Notifications.checkPermissions()) +
          ' stored notifications: ' +
          JSON.stringify(await Notifications.getStoredNotifications()),
      );
      setIsLoading(false);
    })();
  }, []);

  //bolt hub useeffect
  useEffect(() => {
    AsyncStorage.getItem(AppStorage.LNDHUB)
      .then(value => setURI(value ?? undefined))
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));

    if (params?.url) {
      Alert.alert(
        loc.formatString(loc.settings.set_lndhub_as_default, { url: params.url }) as string,
        '',
        [
          {
            text: loc._.ok,
            onPress: () => {
              params?.url && setLndhubURI(params.url);
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }
  }, [params?.url]);

  //gc useeffect
  useEffect(() => {
    (async () => {
      setNotificationURI(await Notifications.getSavedUri());

      if (params?.gcurl) {
        Alert.alert(
          loc.formatString(loc.settings.set_lndhub_as_default, { url: params.gcurl }) as string,
          '',
          [
            {
              text: loc._.ok,
              onPress: () => {
                params?.gcurl && setNotificationURI(params.gcurl);
              },
              style: 'default',
            },
            { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
          ],
          { cancelable: false },
        );
      }
    })();
  }, [params?.gcurl]);


  const onNotificationsSwitch = async value => {
    setNotificationsEnabled(value); // so the slider is not 'jumpy'
    if (value) {
      PushNotification.checkPermissions(async permissions => {
        if (permissions.alert !== true) {
          alert(
            "Bolt Card Wallet does not have permission to send you notifications.  Please add this permission in your OS settings and try again."
          );
          onNotificationsSwitch(false);
        } else {
          // user is ENABLING notifications
          await Notifications.cleanUserOptOutFlag();
          if (await Notifications.getPushToken()) {
            // we already have a token, so we just need to reenable ALL level on groundcontrol:
            await Notifications.setLevels(true);
          } else {
            // ok, we dont have a token. we need to try to obtain permissions, configure callbacks and save token locally:
            await Notifications.tryToObtainPermissions();
          }
        }
      });
    } else {
      // user is DISABLING notifications
      await Notifications.setLevels(false);
    }

    setNotificationsEnabled(await Notifications.isNotificationsEnabled());
  };

  const setLndhubURI = (value: string) => {
    // in case user scans a QR with a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
    const setLndHubUrl = DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value);
    const setGCUrl = DeeplinkSchemaMatch.getGcUrlFromSetLndhubUrlAction(value);
    const lndhubURI = typeof setLndHubUrl === 'string' ? setLndHubUrl.trim() : value.trim();
    const gcURI = typeof setGCUrl === 'string' ? setGCUrl.trim() : value.trim();
    setURI(lndhubURI);
    setNotificationURI(gcURI);
  };

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      let success = true;
      if (URI) {
        await LightningCustodianWallet.isValidNodeAddress(URI);
        // validating only if its not empty. empty means use default
      }
      if (URI) {
        await AsyncStorage.setItem(AppStorage.LNDHUB, URI);
      } else {
        await AsyncStorage.removeItem(AppStorage.LNDHUB);
      }
      if (notificationURI) {
        // validating only if its not empty. empty means use default
        if (await Notifications.isGroundControlUriValid(notificationURI)) {
          await Notifications.saveUri(notificationURI);
        } else {
          alert(loc.settings.not_a_valid_uri);
          success = false;
        }
      } else {
        await Notifications.saveUri('');
      }

      if(success) {
        alert(loc.settings.lightning_saved);
      }
    } catch (error) {
      alert(loc.settings.lightning_error_lndhub_uri);
      console.log(error);
    }
    setIsLoading(false);
  }, [URI, notificationURI]);

  const importScan = () => {
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: route.name,
        onBarScanned: setLndhubURI,
        showFileImportButton: true,
      },
    });
  };

  return (
    <SafeBlueArea>
      
      <BlueListItem
        Component={TouchableWithoutFeedback}
        title={loc.settings.push_notifications}
        switch={{ onValueChange: onNotificationsSwitch, value: isNotificationsEnabled, testID: 'NotificationsSwitch' }}
      />
      <BlueSpacing20 />
      <BlueCard>
        <BlueText>{loc.settings.lightning_settings_explain}</BlueText>
      </BlueCard>
      <Button
        icon={{
          name: 'github',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        onPress={() => Linking.openURL('https://github.com/boltcard/boltcard-lndhub')}
        titleStyle={{ color: colors.buttonAlternativeTextColor }}
        title="github.com/boltcard/boltcard-lndhub"
        // TODO: looks like there's no `color` prop on `Button`, does this make any sense?
        // color={colors.buttonTextColor}
        buttonStyle={styles.buttonStyle}
      />

      <BlueCard>
        <BlueSpacing20 />
        <BlueButton title={<BlueText><Icon name='qrcode' size={18} type="font-awesome" color="#ffffff" /> Scan QR code</BlueText>} testID="ImportScan" onPress={importScan} />
        <BlueSpacing20 />
        <BlueText>Bolt Hub Server</BlueText>
        <View style={[styles.uri, styleHook.uri]}>
          <TextInput
            value={URI}
            placeholder={
              loc.formatString(loc.settings.lndhub_uri, { example: 'https://10.20.30.40:8080' })
            }
            onChangeText={setURI}
            numberOfLines={1}
            style={styles.uriText}
            placeholderTextColor="#81868e"
            editable={!isLoading}
            textContentType="URL"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
            testID="URIInput"
          />
        </View>
        <BlueSpacing20 />
        <BlueText>Notification Server</BlueText>
        <View style={[styles.uri, styleHook.uri]}>
          <TextInput
            value={notificationURI}
            placeholder={Notifications.getDefaultUri()}
            onChangeText={setNotificationURI}
            numberOfLines={1}
            style={styles.uriText}
            placeholderTextColor="#81868e"
            editable={!isLoading}
            textContentType="URL"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
            testID="URIInput"
          />
        </View>
        <BlueSpacing20 />
        <BlueText style={styles.centered} onPress={() => setShowTokenInfo(isShowTokenInfo + 1)}>
          ♪ Ground Control to Major Tom ♪
        </BlueText>
        <BlueText style={styles.centered} onPress={() => setShowTokenInfo(isShowTokenInfo + 1)}>
          ♪ Commencing countdown, engines on ♪
        </BlueText>

        {isShowTokenInfo >= 9 && (
          <View>
            <BlueCopyToClipboardButton stringToCopy={tokenInfo} displayText={tokenInfo} />
          </View>
        )}

        <BlueSpacing20 />
        {isLoading ? <BlueLoading /> : <BlueButton testID="Save" onPress={save} title={loc.settings.save} />}
      </BlueCard>
    </SafeBlueArea>
  );
};

BolthubSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: "Bolt Hub Settings" }));

export default BolthubSettings;
