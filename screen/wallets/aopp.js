import React, { useEffect, useContext } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { BlueStorageContext } from '../../blue_modules/storage-context';
import { SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import AOPPClient from '../../class/aopp';
import selectWallet from '../../helpers/select-wallet';

const AOPP = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { uri } = useRoute().params;
  const { name } = useRoute();
  const { wallets } = useContext(BlueStorageContext);

  useEffect(() => {
    (async () => {
      let aopp;
      try {
        aopp = new AOPPClient(uri);
      } catch (e) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        Alert.alert(loc.errors.error, e.message);
        return navigation.pop();
      }

      let availableWallets = wallets.filter(w => w.allowSignVerifyMessage());
      if (aopp.format !== AOPPClient.typeAny) {
        const segwitType = AOPPClient.getSegwitByAddressFormat(aopp.format);
        availableWallets = availableWallets.filter(w => w.segwitType === segwitType);
      }

      const wallet = await selectWallet(navigation.navigate, name, false, availableWallets, 'Onchain wallet is required to sign a message');
      if (!wallet) return navigation.pop();

      const address = await wallet.getAddressAsync();
      navigation.navigate('SignVerify', {
        walletID: wallet.getID(),
        address,
        message: aopp.msg,
        aoppURI: uri,
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeBlueArea style={[styles.center, { backgroundColor: colors.elevated }]}>
      <ActivityIndicator />
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

AOPP.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.aopp.title }));

export default AOPP;
