import React from 'react';
import { Dimensions, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { images } from 'app/assets';
import { Route, Wallet } from 'app/consts';
import { NavigationService } from 'app/services';
import { palette, typography } from 'app/styles';

import { GradientView } from './GradientView';
import { Image } from './Image';
import { StyledText } from './StyledText';

const i18n = require('../../loc');

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.82;
const ITEM_HEIGHT = ITEM_WIDTH * 0.63;

interface Props {
  showEditButton?: boolean;
  wallet: Wallet;
  containerStyle?: StyleProp<ViewStyle>;
}

// NOTE do not make it PureComponent as we are mutating wallet objects
// when changing their labels, so it won't rerender
export class WalletCard extends React.Component<Props> {
  render() {
    const { showEditButton, wallet, containerStyle } = this.props;
    return (
      <GradientView style={[styles.itemContainer, containerStyle]} variant={GradientView.Variant.Primary}>
        <>
          <Image source={images.coinLogoInCircle} style={styles.iconInCircle} resizeMode="contain" />
          <View style={styles.cardContent}>
            <View style={styles.row}>
              <Text style={styles.walletType}>{wallet.getLabel()}</Text>
              {showEditButton && (
                <StyledText title="Edit" onPress={() => NavigationService.navigate(Route.WalletDetails, { wallet })} />
              )}
            </View>

            <Text style={styles.balance}>
              {i18n.formatBalance(Number(wallet.balance), wallet.preferredBalanceUnit, true)}
            </Text>
            <View>
              <Text style={styles.latestTransactionTitle}>{i18n.wallets.details.latestTransaction}</Text>
              <Text style={styles.latestTransaction}>
                {i18n.transactionTimeToReadable(wallet.getLatestTransactionTime())}
              </Text>
            </View>
          </View>
        </>
      </GradientView>
    );
  }
}

const styles = StyleSheet.create({
  itemContainer: {
    height: ITEM_HEIGHT,
    borderRadius: 10,
    padding: 20,
    aspectRatio: 1.586, // credit card aspect ratio ISO/IEC 7810
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletType: {
    ...typography.headline7,
    color: palette.white,
    maxWidth: ITEM_WIDTH - 60,
  },
  balance: {
    ...typography.headline3,
    color: palette.white,
  },
  latestTransactionTitle: {
    ...typography.subtitle3,
    color: palette.white,
  },
  latestTransaction: {
    ...typography.headline5,
    color: palette.white,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconInCircle: {
    height: 50,
    width: 50,
    position: 'absolute',
    bottom: 10,
    right: 20,
  },
});
