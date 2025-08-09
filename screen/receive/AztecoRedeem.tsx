import { RouteProp, useRoute } from '@react-navigation/native';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BlueText } from '../../BlueComponents';
import Azteco from '../../class/azteco';
import { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import { BlueLoading } from '../../components/BlueLoading';
import { BlueSpacing } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type RouteProps = RouteProp<DetailViewStackParamList, 'AztecoRedeem'>;

const AztecoRedeem = () => {
  const navigation = useExtendedNavigation();
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const { aztecoVoucher } = route.params;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wallet, setWallet] = useState<undefined | TWallet>(undefined);

  useEffect(() => {
    const suitable = wallets.filter(w => w.chain === Chain.ONCHAIN);
    if (suitable.length === 0) {
      presentAlert({ message: loc.azteco.errorBeforeRefeem });
      navigation.goBack();
      return;
    }
    setWallet(suitable[0]);

    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedeem = async (): Promise<void> => {
    if (!wallet) {
      presentAlert({ message: loc.azteco.errorSomething });
      return;
    }

    setIsLoading(true);
    const address = await wallet.getAddressAsync();
    if (!address) {
      navigation.goBack();
      presentAlert({ message: loc.receive.address_not_found });
      return;
    }
    const result = await Azteco.redeem(aztecoVoucher, address);
    if (!result) {
      presentAlert({ message: loc.azteco.errorSomething });
      setIsLoading(false);
    } else {
      navigation.goBack();
      presentAlert({ title: loc.azteco.success, message: loc.azteco.successMessage });
    }
  };

  const handleSelectWallet = (): void => {
    const onWalletSelect = (toWallet: TWallet): void => {
      setWallet(toWallet);
      navigation.goBack();
    };

    navigation.navigate('SelectWallet', {
      onWalletSelect,
      availableWallets: wallets,
    });
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    text: {
      color: colors.foregroundColor,
    },
  });

  if (isLoading || !wallet) {
    return (
      <View style={styles.loading}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <View style={styles.root}>
        <Text style={stylesHook.text}>{loc.azteco.codeIs}</Text>
        <BlueText testID="AztecoCode" style={[styles.code, stylesHook.text]}>
          {aztecoVoucher.c1}-{aztecoVoucher.c2}-{aztecoVoucher.c3}-{aztecoVoucher.c4}
        </BlueText>

        <View style={styles.selectWallet1}>
          <TouchableOpacity accessibilityRole="button" style={styles.selectTouch} onPress={handleSelectWallet}>
            <Text style={[styles.selectText, stylesHook.text]}>{loc.azteco.redeem}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
          <View style={styles.selectWallet2}>
            <TouchableOpacity accessibilityRole="button" style={styles.selectTouch} onPress={handleSelectWallet}>
              <Text style={[styles.selectWalletLabel, stylesHook.text]}>{wallet.getLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button onPress={handleRedeem} title={loc.azteco.redeemButton} />
        <BlueSpacing />
      </View>
    </SafeArea>
  );
};

export default AztecoRedeem;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    alignItems: 'center',
    alignContent: 'flex-end',
    paddingTop: 66,
  },
  code: {
    fontSize: 20,
    marginTop: 20,
    marginBottom: 90,
  },
  selectWallet1: {
    marginBottom: 24,
    alignItems: 'center',
  },
  selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    marginRight: 8,
  },
  selectWallet2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectWalletLabel: {
    fontSize: 14,
  },
});
