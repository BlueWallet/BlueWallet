/* global alert */
import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, Linking, StyleSheet, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import { useTheme, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import navigationStyle from '../../components/navigationStyle';
import { BlueButton, BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import { AppStorage } from '../../class';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  uri: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
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
  },
});

const LightningSettings = () => {
  const params = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState();
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  useEffect(() => {
    AsyncStorage.getItem(AppStorage.LNDHUB)
      .then(setURI)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));

    if (params?.url) {
      Alert.alert(
        loc.formatString(loc.settings.set_lndhub_as_default, { url: params?.url }),
        '',
        [
          {
            text: loc._.ok,
            onPress: () => {
              setLndhubURI(params?.url);
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }
  }, [params?.url]);

  const setLndhubURI = value => {
    if (DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value)) {
      // in case user scans a QR with a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
      value = DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value);
    }
    setURI(value.trim());
  };

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (URI) {
        await LightningCustodianWallet.isValidNodeAddress(URI);
        // validating only if its not empty. empty means use default
      }
      await AsyncStorage.setItem(AppStorage.LNDHUB, URI);
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
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
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
        color={colors.buttonTextColor}
        buttonStyle={styles.buttonStyle}
      />

      <BlueCard>
        <View style={styles.uri}>
          <TextInput
            placeholder={LightningCustodianWallet.defaultBaseUri}
            value={URI}
            onChangeText={setLndhubURI}
            numberOfLines={1}
            style={styles.uriText}
            placeholderTextColor="#81868e"
            editable={!isLoading}
            textContentType="URL"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
        </View>

        <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
        <BlueSpacing20 />
        {isLoading ? <BlueLoading /> : <BlueButton onPress={save} title={loc.settings.save} />}
      </BlueCard>
    </SafeBlueArea>
  );
};

LightningSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.lightning_settings }));

export default LightningSettings;
