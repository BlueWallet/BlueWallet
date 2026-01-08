import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Alert, Linking, StyleSheet, View, Text, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DefaultPreference from 'react-native-default-preference';
import { BlueLoading } from '../../components/BlueLoading';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import { Button } from '../../components/Button';
import { useTheme } from '../../components/themes';
import { usePlatformStyles } from '../../theme/platformStyles';
import loc from '../../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';
import { clearLNDHub, getLNDHub, setLNDHub } from '../../helpers/lndHub';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import AddressInput from '../../components/AddressInput';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import PlatformListItem from '../../components/PlatformListItem';

type LightingSettingsRouteProps = RouteProp<DetailViewStackParamList, 'LightningSettings'>;

const LightningSettings: React.FC = () => {
  const params = useRoute<LightingSettingsRouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  const [URI, setURI] = useState<string>();
  const { colors } = useTheme();
  const { colors: platformColors, sizing, layout } = usePlatformStyles();
  const { setParams } = useExtendedNavigation();
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
    },
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: 8,
      padding: sizing.basePadding,
      marginBottom: sizing.baseMargin,
      ...layout.cardShadow,
    },
    explanationText: {
      color: colors.foregroundColor,
      fontSize: 14,
      lineHeight: 20,
    },
    inputContainer: {
      marginTop: sizing.baseMargin,
      marginBottom: sizing.baseMargin,
    },
    buttonContainer: {
      marginTop: sizing.baseMargin,
    },
    githubContainer: {
      marginTop: 16,
    },
    githubItemContainer: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: 8,
      marginBottom: 0,
    },
    addressInput: {
      minHeight: 44,
      height: 'auto',
    },
  });

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
    <SafeAreaScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      headerHeight={headerHeight}
    >
      <View style={styles.card}>
        <Text style={styles.explanationText}>{loc.settings.lightning_settings_explain}</Text>

        <View style={styles.githubContainer}>
          <PlatformListItem
            title="GitHub Repository"
            subtitle="github.com/BlueWallet/LndHub"
            onPress={handleOpenGithub}
            leftIcon={<Icon name="github" color={platformColors.textColor} size={24} />}
            containerStyle={styles.githubItemContainer}
            isFirst
            isLast
            bottomDivider={false}
          />
        </View>
      </View>

      <View style={styles.card}>
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
    </SafeAreaScrollView>
  );
};

export default LightningSettings;
