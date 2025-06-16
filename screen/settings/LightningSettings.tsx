import React, { useCallback, useEffect, useState } from 'react';
import { RouteProp, useRoute, useLocale } from '@react-navigation/native';
import { Alert, Linking, StyleSheet } from 'react-native';
import { Button as ButtonRNElements } from '@rneui/themed';
import DefaultPreference from 'react-native-default-preference';
import { BlueCard, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import { Button } from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { clearLNDHub, getLNDHub, setLNDHub } from '../../helpers/lndHub';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import AddressInput from '../../components/AddressInput';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';

type LightingSettingsRouteProps = RouteProp<DetailViewStackParamList, 'LightningSettings'>;

const LightningSettings: React.FC = () => {
  const params = useRoute<LightingSettingsRouteProps>().params;
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState<string>();
  const { colors } = useTheme();
  const { setParams } = useExtendedNavigation();

  const stylesHook = StyleSheet.create({
    buttonStyle: {
      backgroundColor: 'transparent',
      flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
    },
  });

  useEffect(() => {
    const fetchURI = async () => {
      try {
        // Try fetching from DefaultPreference first as DefaultPreference uses truly native storage
        const value = await getLNDHub();
        setURI(value ?? undefined);
      } catch (error) {
        console.log(error);
      }
    };

    const initialize = async () => {
      setIsLoading(true);
      await fetchURI().finally(() => {
        setIsLoading(false);
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
      });
    };

    // Call the initialize function
    initialize();
  }, [params?.url]);

  const setLndhubURI = (value: string) => {
    // in case user scans a QR with a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
    const setLndHubUrl = DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value);

    setURI(typeof setLndHubUrl === 'string' ? setLndHubUrl.trim() : value.trim());
  };
  const save = useCallback(async () => {
    setIsLoading(true);
    let normalizedURI;
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      if (URI) {
        normalizedURI = new URL(URI.replace(/([^:]\/)\/+/g, '$1')).toString();
        await LightningCustodianWallet.isValidNodeAddress(normalizedURI);

        await setLNDHub(normalizedURI);
      } else {
        await clearLNDHub();
      }

      presentAlert({ message: loc.settings.lightning_saved, type: AlertType.Toast });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({
        message: normalizedURI?.endsWith('.onion') ? loc.settings.lightning_error_lndhub_uri_tor : loc.settings.lightning_error_lndhub_uri,
      });
      console.log(error);
    }
    setIsLoading(false);
  }, [URI]);

  useEffect(() => {
    const data = params?.onBarScanned;
    if (data) {
      setLndhubURI(data);
      setParams({ onBarScanned: undefined });
    }
  }, [params?.onBarScanned, setParams]);

  return (
    <SafeAreaScrollView automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <BlueCard>
        <BlueText>{loc.settings.lightning_settings_explain}</BlueText>
      </BlueCard>

      <ButtonRNElements
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
        buttonStyle={stylesHook.buttonStyle}
      />

      <BlueCard>
        <AddressInput
          isLoading={isLoading}
          address={URI}
          placeholder={loc.formatString(loc.settings.lndhub_uri, { example: 'https://10.20.30.40:3000' })}
          onChangeText={setLndhubURI}
          testID="URIInput"
          editable={!isLoading}
        />
        <BlueSpacing40 />
        {isLoading ? <BlueLoading /> : <Button testID="Save" onPress={save} title={loc.settings.save} />}
      </BlueCard>
    </SafeAreaScrollView>
  );
};

export default LightningSettings;
