import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-snap-carousel';

import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import WalletGradient from '../class/wallet-gradient';
import { LightningCustodianWallet, MultisigHDWallet, PlaceholderWallet } from '../class';
import { BlueCurrentTheme } from './themes';
import { BluePrivateBalance} from '../BlueComponents'

const { height, width } = Dimensions.get('window');

const sliderWidth = width * 1;
const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
const sliderHeight = 190;

export const NewWalletPanel = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity testID="CreateAWallet" {...props} onPress={props.onPress} style={{ marginVertical: 17, paddingRight: 10 }}>
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderRadius: 10,
          minHeight: Platform.OS === 'ios' ? 164 : 181,
          justifyContent: 'center',
          alignItems: 'flex-start',
          backgroundColor: WalletGradient.createWallet(),
        }}
      >
        <Text
          style={{
            fontWeight: '600',
            fontSize: 24,
            color: colors.foregroundColor,
            marginBottom: 4,
          }}
        >
          {loc.wallets.list_create_a_wallet}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.alternativeTextColor,
          }}
        >
          {loc.wallets.list_create_a_wallet1}
        </Text>
        <Text
          style={{
            backgroundColor: 'transparent',
            fontSize: 13,
            color: colors.alternativeTextColor,
          }}
        >
          {loc.wallets.list_create_a_wallet2}
        </Text>
        <View style={{ marginTop: 12, backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}>
          <Text style={{ color: colors.brandingColor, fontWeight: '500' }}>{loc.wallets.list_create_a_button}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const WalletCarouselItem = ({ item, index, onPress, handleLongPress, isSelectedWallet }) => {
  const scaleValue = new Animated.Value(1.0);

  const onPressedIn = () => {
    const props = { duration: 50 };
    props.useNativeDriver = true;

    props.toValue = 0.9;
    Animated.spring(scaleValue, props).start();
  };
  const onPressedOut = () => {
    const props = { duration: 50 };

    props.useNativeDriver = true;

    props.toValue = 1.0;
    Animated.spring(scaleValue, props).start();
  };

  if (!item)
    return (
      <NewWalletPanel
        onPress={() => {
          onPressedOut();
          onPress(index);
        }}
      />
    );

  if (item.type === PlaceholderWallet.type) {
    return (
      <Animated.View
        style={{ paddingRight: 10, marginVertical: 17, transform: [{ scale: scaleValue }] }}
        shadowOpacity={40 / 100}
        shadowOffset={{ width: 0, height: 0 }}
        shadowRadius={5}
      >
        <TouchableWithoutFeedback
          onPressIn={item.getIsFailure() ? onPressedIn : null}
          onPressOut={item.getIsFailure() ? onPressedOut : null}
          onPress={() => {
            if (item.getIsFailure()) {
              onPressedOut();
              onPress(index);
              onPressedOut();
            }
          }}
        >
          <LinearGradient
            shadowColor={BlueCurrentTheme.colors.shadowColor}
            colors={WalletGradient.gradientsFor(item.type)}
            style={{
              padding: 15,
              borderRadius: 10,
              minHeight: 164,
              elevation: 5,
            }}
          >
            <Image
              source={require('./img/btc-shape.png')}
              style={{
                width: 99,
                height: 94,
                position: 'absolute',
                bottom: 0,
                right: 0,
              }}
            />
            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 19,
                color: BlueCurrentTheme.colors.inverseForegroundColor,
              }}
            >
              {item.getLabel()}
            </Text>
            {item.getIsFailure() ? (
              <Text
                numberOfLines={0}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: 19,
                  marginTop: 40,
                  color: BlueCurrentTheme.colors.inverseForegroundColor,
                }}
              >
                {loc.wallets.list_import_error}
              </Text>
            ) : (
              <ActivityIndicator style={{ marginTop: 40 }} />
            )}
          </LinearGradient>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  } else {
    let opacity = 1.0;

    if (isSelectedWallet === false) {
      opacity = 0.5;
    }
    return (
      <Animated.View
        style={{ paddingRight: 10, marginVertical: 17, transform: [{ scale: scaleValue }], opacity }}
        shadowOpacity={40 / 100}
        shadowOffset={{ width: 0, height: 0 }}
        shadowRadius={5}
      >
        <TouchableWithoutFeedback
          testID={item.getLabel()}
          onPressIn={onPressedIn}
          onPressOut={onPressedOut}
          onLongPress={handleLongPress}
          onPress={() => {
            onPressedOut();
            onPress(index);
            onPressedOut();
          }}
        >
          <LinearGradient
            shadowColor={BlueCurrentTheme.colors.shadowColor}
            colors={WalletGradient.gradientsFor(item.type)}
            style={{
              padding: 15,
              borderRadius: 10,
              minHeight: 164,
              elevation: 5,
            }}
          >
            <Image
              source={(() => {
                switch (item.type) {
                  case LightningCustodianWallet.type:
                    return require('./img/lnd-shape.png');
                  case MultisigHDWallet.type:
                    return require('./img/vault-shape.png');
                  default:
                    return require('./img/btc-shape.png');
                }
              })()}
              style={{
                width: 99,
                height: 94,
                position: 'absolute',
                bottom: 0,
                right: 0,
              }}
            />

            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 19,
                color: BlueCurrentTheme.colors.inverseForegroundColor,
              }}
            >
              {item.getLabel()}
            </Text>
            {item.hideBalance ? (
              <BluePrivateBalance />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  backgroundColor: 'transparent',
                  fontWeight: 'bold',
                  fontSize: 36,
                  color: BlueCurrentTheme.colors.inverseForegroundColor,
                }}
              >
                {formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
              </Text>
            )}
            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 13,
                color: BlueCurrentTheme.colors.inverseForegroundColor,
              }}
            >
              {loc.wallets.list_latest_transaction}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 16,
                color: BlueCurrentTheme.colors.inverseForegroundColor,
              }}
            >
              {transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }
};

export class WalletsCarousel extends Component {
  walletsCarousel = React.createRef();

  state = { isLoading: true };

  _renderItem = ({ item, index }) => {
    return (
      <WalletCarouselItem
        isSelectedWallet={this.props.vertical && this.props.selectedWallet && item ? this.props.selectedWallet === item.getID() : undefined}
        item={item}
        index={index}
        handleLongPress={this.props.handleLongPress}
        onPress={this.props.onPress}
      />
    );
  };

  snapToItem = item => {
    // eslint-disable-next-line no-unused-expressions
    this.walletsCarousel?.current?.snapToItem(item);
  };

  onLayout = () => {
    this.setState({ isLoading: false });
  };

  render() {
    return (
      <>
        {this.state.isLoading && (
          <View
            style={{ paddingVertical: sliderHeight / 2, paddingHorizontal: sliderWidth / 2, position: 'absolute', alignItems: 'center' }}
          >
            <ActivityIndicator />
          </View>
        )}
        <Carousel
          ref={this.walletsCarousel}
          renderItem={this._renderItem}
          sliderWidth={sliderWidth}
          sliderHeight={sliderHeight}
          itemWidth={itemWidth}
          inactiveSlideScale={1}
          inactiveSlideOpacity={0.7}
          activeSlideAlignment="start"
          initialNumToRender={10}
          onLayout={this.onLayout}
          contentContainerCustomStyle={{ left: 20 }}
          {...this.props}
        />
      </>
    );
  }
}
