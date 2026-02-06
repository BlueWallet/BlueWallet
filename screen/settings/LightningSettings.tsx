import React, { useCallback, useEffect, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import { BlueLoading } from '../../components/BlueLoading';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import { Button } from '../../components/Button';
import loc from '../../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { clearLNDHub, getLNDHub, setLNDHub } from '../../helpers/lndHub';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import AddressInput from '../../components/AddressInput';
import { SettingsScrollView, SettingsCard, SettingsListItem, SettingsSubtitle, isAndroid } from '../../components/platform';

type LightingSettingsRouteProps = RouteProp<DetailViewStackParamList, 'LightningSettings'>;

const LightningSettings: React.FC = () => {
  const params = useRoute<LightingSettingsRouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState<string>();
  const { setParams } = useExtendedNavigation();

  useEffect(() => {
    const fetchURI = async () => {
      try {
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

    initialize();
  }, [params?.url]);

  const setLndhubURI = (value: string) => {
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

  const handleOpenGithub = () => {
    Linking.openURL('https://github.com/BlueWallet/LndHub');
  };

  return (
    <SettingsScrollView automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <SettingsCard>
        <View style={styles.cardContent}>
          <SettingsSubtitle>{loc.settings.lightning_settings_explain}</SettingsSubtitle>
        </View>
      </SettingsCard>

      <View style={[styles.rowPadding, styles.githubContainer]}>
        <SettingsListItem
          title={loc.settings.lndhub_github}
          subtitle="github.com/BlueWallet/LndHub"
          onPress={handleOpenGithub}
          iconName="github"
          position="single"
        />
      </View>

      <SettingsCard>
        <View style={styles.cardContent}>
          <View style={styles.inputContainer}>
            <AddressInput
              isLoading={isLoading}
              address={URI}
              placeholder={loc.formatString(loc.settings.lndhub_uri, { example: 'https://10.20.30.40:3000' })}
              onChangeText={setLndhubURI}
              testID="URIInput"
              editable={!isLoading}
              style={styles.addressInput}
            />
          </View>

          <View style={styles.buttonContainer}>
            {isLoading ? <BlueLoading /> : <Button testID="Save" onPress={save} title={loc.settings.save} />}
          </View>
        </View>
      </SettingsCard>
    </SettingsScrollView>
  );
};

export default LightningSettings;

const horizontalPadding = isAndroid ? 20 : 16;

const styles = StyleSheet.create({
  rowPadding: {
    paddingHorizontal: horizontalPadding,
  },
  cardContent: {
    paddingHorizontal: horizontalPadding,
    paddingVertical: 12,
  },
  inputContainer: {
    marginTop: isAndroid ? 16 : 12,
    marginBottom: isAndroid ? 16 : 12,
  },
  buttonContainer: {
    marginTop: isAndroid ? 16 : 12,
  },
  githubContainer: {
    marginTop: isAndroid ? 16 : 12,
  },
  addressInput: {
    minHeight: 44,
    height: 'auto',
  },
});
