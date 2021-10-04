/* global alert */
import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, Linking, StyleSheet, Alert, I18nManager } from 'react-native';
import { Button } from 'react-native-elements';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import navigationStyle, { NavigationOptionsGetter } from '../../components/navigationStyle';
import { BlueButton, BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import { AppStorage } from '../../class';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { isTorCapable } from '../../blue_modules/environment';

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
  torSupported: {
    color: '#81868e',
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

const LightningSettings: React.FC & { navigationOptions: NavigationOptionsGetter } = () => {
  const params = useRoute<LightingSettingsRouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState<string>();
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

  const setLndhubURI = (value: string) => {
    // in case user scans a QR with a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
    const setLndHubUrl = DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value);

    setURI(typeof setLndHubUrl === 'string' ? setLndHubUrl.trim() : value.trim());
  };

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (URI) {
        await LightningCustodianWallet.isValidNodeAddress(URI);
        // validating only if its not empty. empty means use default
      }
      if (URI) {
        await AsyncStorage.setItem(AppStorage.LNDHUB, URI);
      } else {
        await AsyncStorage.removeItem(AppStorage.LNDHUB);
      }
      alert(loc.settings.lightning_saved);
    } catch (error) {
      alert(loc.settings.lightning_error_lndhub_uri);
      console.log(error);
    }
    setIsLoading(false);
  }, [URI]);

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
      <BlueCard>
        <BlueText>{loc.settings.lightning_settings_explain}</BlueText>
      </BlueCard>

      <Button
        icon={{
          name: 'github',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        onPress={() => Linking.openURL('https://github.com/BlueWallet/LndHub')}
        titleStyle={{ color: colors.buttonAlternativeTextColor }}
        title="github.com/BlueWallet/LndHub"
        // TODO: looks like there's no `color` prop on `Button`, does this make any sense?
        // color={colors.buttonTextColor}
        buttonStyle={styles.buttonStyle}
      />

      <BlueCard>
        <View style={[styles.uri, styleHook.uri]}>
          <TextInput
            value={URI}
            placeholder={
              loc.formatString(loc.settings.lndhub_uri, { example: 'https://10.20.30.40:3000' }) +
              (isTorCapable ? ' (' + loc.settings.tor_supported + ')' : '')
            }
            onChangeText={setLndhubURI}
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
        <BlueButtonLink title={loc.wallets.import_scan_qr} testID="ImportScan" onPress={importScan} />
        <BlueSpacing20 />
        {isLoading ? <BlueLoading /> : <BlueButton testID="Save" onPress={save} title={loc.settings.save} />}
      </BlueCard>
    </SafeBlueArea>
  );
};

LightningSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.lightning_settings }));

export default LightningSettings;
