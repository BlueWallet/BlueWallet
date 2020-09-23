import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

import { WalletItem, GradientView } from 'app/components';
import { Wallet, RootStackParams, Route } from 'app/consts';
import { typography, palette } from 'app/styles';

const SCREEN_HEIGHT = Dimensions.get('screen').height;
const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.ActionSheet>;
  route: RouteProp<RootStackParams, Route.ActionSheet>;
}

export const ActionSheet = (props: Props) => {
  const renderWalletItems = () => {
    const { wallets, selectedIndex, onPress } = props.route.params;

    return wallets.map((wallet: Wallet, index: number) => (
      <WalletItem
        key={`${wallet.secret}${wallet.label}`}
        variant={wallet.label === 'All wallets' ? GradientView.Variant.Secondary : GradientView.Variant.Primary}
        value={wallet.balance}
        unit="BTCV"
        name={wallet.label === 'All wallets' ? i18n.wallets.dashboard.allWallets : wallet.label}
        title={wallet.label === 'All wallets' ? 'AW' : wallet.label[0]}
        selected={index == selectedIndex}
        index={index}
        onPress={() => {
          props.navigation.goBack();
          onPress(index);
        }}
      />
    ));
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => {
        props.navigation.goBack();
      }}
      style={styles.modal}
    >
      <TouchableOpacity activeOpacity={1}>
        <ScrollView style={styles.containerStyle} bounces={false} onStartShouldSetResponder={() => true}>
          <View style={styles.breakLine} />
          <Text style={styles.titleStyle}>{i18n.wallets.walletModal.wallets}</Text>
          <View style={styles.walletContainer}>{renderWalletItems()}</View>
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.modalTransparent },
  containerStyle: {
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT / 2,
    backgroundColor: palette.white,
    borderRadius: 8,
  },
  titleStyle: {
    ...typography.headline4,
    textAlign: 'center',
  },
  walletContainer: {
    marginTop: 31,
  },
  breakLine: {
    marginBottom: 13,
    marginTop: 16,
    height: 3,
    width: 36,
    backgroundColor: palette.grey,
    alignSelf: 'center',
  },
});
