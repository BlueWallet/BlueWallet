import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, Dimensions, Animated, PanResponder } from 'react-native';

import { WalletItem, GradientView } from 'app/components';
import { Wallet, RootStackParams, Route } from 'app/consts';
import { typography, palette } from 'app/styles';

const SCREEN_HEIGHT = Dimensions.get('screen').height;
const TOP_POSITION = -SCREEN_HEIGHT / 2;
const CLOSE_POSITION = SCREEN_HEIGHT / 4;
const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.ActionSheet>;
  route: RouteProp<RootStackParams, Route.ActionSheet>;
}

export class ActionSheet extends PureComponent<Props> {
  panResponderValue = new Animated.ValueXY();
  animatedValue = new Animated.Value(0);

  componentDidMount() {
    this.open();
  }

  springAnimation = (toYValue: number, tension?: number) =>
    Animated.spring(this.panResponderValue, {
      toValue: { x: 0, y: toYValue },
      tension: tension || 0,
      useNativeDriver: true,
    }).start();

  timingAnimation = (toValue: number) =>
    Animated.timing(this.animatedValue, { toValue, duration: 200, useNativeDriver: false }).start();

  panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) return;
      this.panResponderValue.setValue({ x: 0, y: TOP_POSITION + gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > CLOSE_POSITION) {
        this.close();
      } else {
        this.springAnimation(TOP_POSITION, 100);
      }
    },
  });

  open = () => {
    this.timingAnimation(1);
    this.springAnimation(TOP_POSITION, 30);
  };

  close = () => {
    this.timingAnimation(0);
    this.springAnimation(0);

    this.props.navigation.popToTop();
  };

  renderWalletItems = () => {
    const { wallets, selectedIndex, onPress } = this.props.route.params;

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
          this.close();
          onPress(index);
        }}
      />
    ));
  };

  render() {
    const animatedBackgroundColor = this.animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [palette.transparent, palette.modalTransparent],
    });

    return (
      <Animated.View style={[styles.modal, { backgroundColor: animatedBackgroundColor }]}>
        <TouchableOpacity style={styles.closeBackground} onPress={this.close} />
        <Animated.View
          style={[
            styles.containerStyle,
            {
              transform: [{ translateY: this.panResponderValue.y }],
            },
          ]}
        >
          <View {...this.panResponder.panHandlers}>
            <View style={styles.breakLine} />
            <Text style={styles.titleStyle}>{i18n.wallets.walletModal.wallets}</Text>
          </View>
          <ScrollView bounces={false} style={styles.walletContainer}>
            {this.renderWalletItems()}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  closeBackground: {
    flex: 1,
  },
  containerStyle: {
    position: 'absolute',
    width: '100%',
    top: SCREEN_HEIGHT,
    height: SCREEN_HEIGHT / 2 + 40,
    backgroundColor: palette.white,
    borderRadius: 8,
  },
  titleStyle: {
    ...typography.headline4,
    textAlign: 'center',
  },
  walletContainer: {
    paddingHorizontal: 20,
    marginTop: 31,
    marginBottom: 50,
    flex: 1,
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
