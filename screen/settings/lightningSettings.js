/* global alert */
import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, Linking, StyleSheet } from 'react-native';
import { Button } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';

import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import {
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueLoadingHook,
  BlueTextHooks,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';

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
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState();
  const { colors } = useTheme();

  useEffect(() => {
    AsyncStorage.getItem(AppStorage.LNDHUB)
      .then(setURI)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, []);

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

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <BlueCard>
        <BlueTextHooks>{loc.settings.lightning_settings_explain}</BlueTextHooks>
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
        {isLoading ? <BlueLoadingHook /> : <BlueButton onPress={save} title={loc.settings.save} />}
      </BlueCard>
    </SafeBlueArea>
  );
};

LightningSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.lightning_settings,
});
export default LightningSettings;
