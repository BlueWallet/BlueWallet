import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { saveServerIdentity } from '../../blue_modules/electrumServerIdentity';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ElectrumCertificateSheet = () => {
  const navigation = useNavigation();
  const { host, port, savedPubkey, newPubkey } = useRoute<RouteProp<DetailViewStackParamList, 'ElectrumCertificateSheet'>>().params;
  const { colors } = useTheme();

  const stylesHook = useMemo(
    () => ({
      root: { backgroundColor: colors.elevated },
      text: { color: colors.foregroundColor },
      label: { color: colors.alternativeTextColor },
    }),
    [colors.alternativeTextColor, colors.elevated, colors.foregroundColor],
  );

  const reconnect = useCallback(() => {
    navigation.goBack();
    BlueElectrum.forceDisconnect();
    setTimeout(() => {
      BlueElectrum.ensureConnected({ showAlertOnFailure: true }).catch(() => {});
    }, 500);
  }, [navigation]);

  const trustNewKey = useCallback(async () => {
    await saveServerIdentity(host, port, newPubkey);
    reconnect();
  }, [host, port, newPubkey, reconnect]);

  const useDefaultServers = useCallback(async () => {
    await BlueElectrum.removePreferredServer();
    reconnect();
  }, [reconnect]);

  return (
    <SafeAreaView style={[styles.root, stylesHook.root]} edges={['bottom', 'left', 'right']} testID="ElectrumCertificateSheet">
      <Text style={[styles.title, stylesHook.text]} accessibilityRole="header">
        {loc.settings.electrum_cert_changed_title}
      </Text>
      <Text style={[styles.message, stylesHook.text]}>
        {loc.formatString(loc.settings.electrum_cert_changed, { server: `${host}:${port}` })}
      </Text>
      <View>
        <Text style={[styles.label, stylesHook.label]}>{loc.settings.electrum_cert_saved_key}</Text>
        <Text style={[styles.key, stylesHook.text]} selectable>
          {savedPubkey}
        </Text>
      </View>
      <View>
        <Text style={[styles.label, stylesHook.label]}>{loc.settings.electrum_cert_new_key}</Text>
        <Text style={[styles.key, stylesHook.text]} selectable testID="ElectrumCertificateNewKey">
          {newPubkey}
        </Text>
      </View>
      <SecondButton title={loc.settings.electrum_cert_trust} onPress={trustNewKey} testID="ElectrumCertificateTrust" />
      <SecondButton title={loc.settings.electrum_cert_use_default} onPress={useDefaultServers} testID="ElectrumCertificateUseDefault" />
      <Button title={loc._.cancel} onPress={navigation.goBack} testID="ElectrumCertificateCancel" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    padding: 22,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  key: {
    fontSize: 13,
  },
});

export default ElectrumCertificateSheet;
