/** @type {AppStorage} */
import React, { Component } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { Icon, Button, FormLabel, FormInput, Text, Header, List, ListItem } from 'react-native-elements';
import {
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  View,
  StyleSheet,
  Dimensions,
  Image,
  SafeAreaView,
  Clipboard,
  Platform,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { WatchOnlyWallet, LegacyWallet } from './class';
import Carousel from 'react-native-snap-carousel';
import DeviceInfo from 'react-native-device-info';
import { HDLegacyP2PKHWallet } from './class/hd-legacy-p2pkh-wallet';
import { HDLegacyBreadwalletWallet } from './class/hd-legacy-breadwallet-wallet';
import { HDSegwitP2SHWallet } from './class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from './class/lightning-custodian-wallet';
import { BitcoinUnit } from './models/bitcoinUnits';
let loc = require('./loc/');
/** @type {AppStorage} */
let BlueApp = require('./BlueApp');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export class BlueButton extends Component {
  render() {
    // eslint-disable-next-line
    this.props.buttonStyle = this.props.buttonStyle || {};

    return (
      <Button
        activeOpacity={0.1}
        delayPressIn={0}
        {...this.props}
        style={{
          borderWidth: 0.7,
          borderColor: 'transparent',
        }}
        buttonStyle={Object.assign(
          {
            backgroundColor: '#ccddf9',
            minHeight: 45,
            height: 45,
            borderWidth: 0,
            borderRadius: 25,
          },
          this.props.buttonStyle,
        )}
        color="#0c2550"
      />
    );
  }
}

export class BitcoinButton extends Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => {
          // eslint-disable-next-line
          if (this.props.onPress) this.props.onPress();
        }}
      >
        <View
          style={{
            // eslint-disable-next-line
            borderColor: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2',
            borderWidth: 0.5,
            borderRadius: 5,
            backgroundColor: '#f5f5f5',
            // eslint-disable-next-line
            width: this.props.style.width,
            // eslint-disable-next-line
            height: this.props.style.height,
          }}
        >
          <View style={{ paddingTop: 30 }}>
            <Icon name="btc" size={32} type="font-awesome" color={(this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2'} />
            <Text style={{ textAlign: 'center', color: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2' }}>
              {loc.wallets.add.bitcoin}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class LightningButton extends Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => {
          // eslint-disable-next-line
          if (this.props.onPress) this.props.onPress();
        }}
      >
        <View
          style={{
            // eslint-disable-next-line
            borderColor: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2',
            borderWidth: 0.5,
            borderRadius: 5,
            backgroundColor: '#f5f5f5',
            // eslint-disable-next-line
            width: this.props.style.width,
            // eslint-disable-next-line
            height: this.props.style.height,
          }}
        >
          <View style={{ paddingTop: 30 }}>
            <Icon name="bolt" size={32} type="font-awesome" color={(this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2'} />
            <Text style={{ textAlign: 'center', color: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2' }}>
              {loc.wallets.add.lightning}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueButtonLink extends Component {
  render() {
    // eslint-disable-next-line
    this.props.buttonStyle = this.props.buttonStyle || {};

    return (
      <Button
        activeOpacity={0.1}
        delayPressIn={0}
        {...this.props}
        style={{
          marginTop: 20,
          borderWidth: 0.7,
          borderColor: 'transparent',
        }}
        buttonStyle={{
          height: 45,
          width: width / 1.5,
        }}
        backgroundColor="transparent"
        color="#0c2550"
      />
    );
  }
}

export const BlueNavigationStyle = (navigation, withNavigationCloseButton = false, customCloseButtonFunction = undefined) => ({
  headerStyle: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    color: '#0c2550',
  },
  headerTintColor: '#0c2550',
  headerRight: withNavigationCloseButton ? (
    <TouchableOpacity
      style={{ width: 40, height: 40, padding: 14 }}
      onPress={customCloseButtonFunction === undefined ? () => navigation.goBack(null) : customCloseButtonFunction}
    >
      <Image style={{ alignSelf: 'center' }} source={require('./img/close.png')} />
    </TouchableOpacity>
  ) : null,
  headerBackTitle: null,
});

export const BlueCopyToClipboardButton = ({ stringToCopy }) => {
  return (
    <TouchableOpacity {...this.props} onPress={() => Clipboard.setString(stringToCopy)}>
      <Text style={{ fontSize: 13, fontWeight: '400', color: '#68bbe1' }}>{loc.transactions.details.copy}</Text>
    </TouchableOpacity>
  );
};

export class SafeBlueArea extends Component {
  render() {
    return (
      <SafeAreaView
        {...this.props}
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueCard extends Component {
  render() {
    return <View {...this.props} style={{ padding: 20 }} />;
  }
}

export class BlueText extends Component {
  render() {
    return (
      <Text
        style={Object.assign(
          {
            color: BlueApp.settings.foregroundColor,
          },
          // eslint-disable-next-line
          this.props.style,
        )}
        {...this.props}
      />
    );
  }
}
export class BlueTextCentered extends Component {
  render() {
    return <Text {...this.props} style={{ color: BlueApp.settings.foregroundColor, textAlign: 'center' }} />;
  }
}

export class BlueListItem extends Component {
  render() {
    return (
      <ListItem
        bottomDivider
        containerStyle={{
          backgroundColor: 'transparent',
          borderBottomStartRadius: 20,
          borderBottomEndRadius: 20,
          borderBottomColor: '#ededed',
        }}
        titleStyle={{
          color: BlueApp.settings.foregroundColor,
          fontSize: 16,
          fontWeight: '500',
        }}
        subtitleStyle={{ color: '#9aa0aa' }}
        subtitleNumberOfLines={1}
        {...this.props}
      />
    );
  }
}

export class BlueFormLabel extends Component {
  render() {
    return <FormLabel {...this.props} labelStyle={{ color: BlueApp.settings.foregroundColor, fontWeight: '400' }} />;
  }
}

export class BlueFormInput extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{ color: BlueApp.settings.foregroundColor, maxWidth: width - 105 }}
        containerStyle={{
          marginTop: 5,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }
}

export class BlueFormMultiInput extends Component {
  render() {
    return (
      <TextInput
        multiline
        underlineColorAndroid="transparent"
        numberOfLines={4}
        style={{
          marginTop: 5,
          marginHorizontal: 20,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
          height: 200,
          color: BlueApp.settings.foregroundColor,
        }}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        {...this.props}
      />
    );
  }
}

export class BlueFormInputAddress extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{
          maxWidth: width - 110,
          color: BlueApp.settings.foregroundColor,
          fontSize: (isIpad && 10) || ((is.iphone8() && 12) || 14),
        }}
        containerStyle={{
          marginTop: 5,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }
}

export class BlueHeader extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor="transparent"
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        statusBarProps={{ barStyle: 'default' }}
      />
    );
  }
}

export class BlueHeaderDefaultSub extends Component {
  render() {
    return (
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }}>
        <Header
          backgroundColor="#FFFFFF"
          outerContainerStyles={{
            borderBottomColor: 'transparent',
            borderBottomWidth: 0,
          }}
          statusBarProps={{ barStyle: 'default' }}
          leftComponent={
            <Text
              adjustsFontSizeToFit
              style={{
                fontWeight: 'bold',
                fontSize: 34,
                color: BlueApp.settings.foregroundColor,
              }}
            >
              {
                // eslint-disable-next-line
                this.props.leftText
              }
            </Text>
          }
          rightComponent={
            <TouchableOpacity
              onPress={() => {
                // eslint-disable-next-line
                if (this.props.onClose) this.props.onClose();
              }}
            >
              <View style={stylesBlueIcon.box}>
                <View style={stylesBlueIcon.ballTransparrent}>
                  <Image source={require('./img/close.png')} />
                </View>
              </View>
            </TouchableOpacity>
          }
          {...this.props}
        />
      </SafeAreaView>
    );
  }
}

export class BlueHeaderDefaultMain extends Component {
  render() {
    return (
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }}>
        <Header
          {...this.props}
          backgroundColor="#FFFFFF"
          outerContainerStyles={{
            borderBottomColor: 'transparent',
            borderBottomWidth: 0,
          }}
          statusBarProps={{ barStyle: 'default' }}
          leftComponent={
            <Text
              numberOfLines={0}
              style={{
                fontWeight: 'bold',
                fontSize: 34,
                color: BlueApp.settings.foregroundColor,
              }}
            >
              {
                // eslint-disable-next-line
                this.props.leftText
              }
            </Text>
          }
          rightComponent={
            <TouchableOpacity
              onPress={this.props.onNewWalletPress}
              style={{
                height: 48,
                alignSelf: 'flex-end',
              }}
            >
              <BluePlusIcon />
            </TouchableOpacity>
          }
        />
      </SafeAreaView>
    );
  }
}

export class BlueSpacing extends Component {
  render() {
    return <View {...this.props} style={{ height: 60, backgroundColor: BlueApp.settings.brandingColor }} />;
  }
}

export class BlueSpacing40 extends Component {
  render() {
    return <View {...this.props} style={{ height: 50, backgroundColor: BlueApp.settings.brandingColor }} />;
  }
}

export class BlueSpacingVariable extends Component {
  render() {
    if (isIpad) {
      return <BlueSpacing40 {...this.props} />;
    } else {
      return <BlueSpacing {...this.props} />;
    }
  }
}

export class is {
  static ipad() {
    return isIpad;
  }

  static iphone8() {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return DeviceInfo.getDeviceId() === 'iPhone10,4';
  }
}

export class BlueSpacing20 extends Component {
  render() {
    return <View {...this.props} style={{ height: 20, opacity: 0 }} />;
  }
}

export class BlueList extends Component {
  render() {
    return (
      <List
        {...this.props}
        containerStyle={{
          backgroundColor: BlueApp.settings.brandingColor,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          flex: 1,
        }}
      />
    );
  }
}

export class BlueLoading extends Component {
  render() {
    return (
      <SafeBlueArea>
        <View style={{ flex: 1, paddingTop: 200 }}>
          <ActivityIndicator />
        </View>
      </SafeBlueArea>
    );
  }
}

const stylesBlueIcon = StyleSheet.create({
  container: {
    flex: 1,
  },
  box1: {
    position: 'relative',
    top: 15,
  },
  box: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  boxIncomming: {
    position: 'relative',
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccddf9',
  },
  ballIncomming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d2f8d6',
    transform: [{ rotate: '-45deg' }],
  },
  ballIncommingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d2f8d6',
  },
  ballReceive: {
    width: 30,
    height: 30,
    borderBottomLeftRadius: 15,
    backgroundColor: '#d2f8d6',
    transform: [{ rotate: '-45deg' }],
  },
  ballOutgoing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8d2d2',
    transform: [{ rotate: '225deg' }],
  },
  ballOutgoingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8d2d2',
  },
  ballTransparrent: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  ballDimmed: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'gray',
  },
});
export class BluePlusIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.box1}>
          <View style={stylesBlueIcon.ball}>
            <Ionicons
              {...this.props}
              name={'ios-add'}
              size={26}
              style={{
                color: BlueApp.settings.foregroundColor,
                backgroundColor: 'transparent',
                left: 8,
                top: 1,
              }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionIncommingIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballIncomming}>
            <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#37c0a1" iconStyle={{ left: 0, top: 8 }} />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionPendingIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ball}>
            <Icon
              {...this.props}
              name="ellipsis-h"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.foregroundColor}
              iconStyle={{ left: 0, top: 6 }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionExpiredIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballOutgoingWithoutRotate}>
            <Icon {...this.props} name="hourglass-end" size={16} type="font-awesome" color="#d0021b" iconStyle={{ left: 0, top: 6 }} />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOnchainIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballIncomming}>
            <Icon
              {...this.props}
              name="link"
              size={16}
              type="font-awesome"
              color="#37c0a1"
              iconStyle={{ left: 0, top: 7, transform: [{ rotate: '-45deg' }] }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOffchainIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballOutgoingWithoutRotate}>
            <Icon {...this.props} name="bolt" size={16} type="font-awesome" color="#d0021b" iconStyle={{ left: 0, top: 7 }} />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOffchainIncomingIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballIncommingWithoutRotate}>
            <Icon {...this.props} name="bolt" size={16} type="font-awesome" color="#37c0a1" iconStyle={{ left: 0, top: 7 }} />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOutgoingIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballOutgoing}>
            <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#d0021b" iconStyle={{ left: 0, top: 8 }} />
          </View>
        </View>
      </View>
    );
  }
}

//

export class BlueReceiveButtonIcon extends Component {
  render() {
    return (
      <TouchableOpacity {...this.props}>
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              minWidth: 110,
              minHeight: 40,
              position: 'relative',
              backgroundColor: '#ccddf9',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                minWidth: 30,
                minHeight: 30,
                backgroundColor: 'transparent',
                transform: [{ rotate: '-45deg' }],
                alignItems: 'center',
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" iconStyle={{ left: 5, top: 12 }} />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                left: 5,
                backgroundColor: 'transparent',
              }}
            >
              {loc.receive.header.toLowerCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueSendButtonIcon extends Component {
  render() {
    return (
      <TouchableOpacity {...this.props}>
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              width: 110,
              height: 40,
              backgroundColor: '#ccddf9',
              alignItems: 'center',
              paddingLeft: 15,
            }}
          >
            <View
              style={{
                minWidth: 30,
                minHeight: 30,
                left: 5,
                backgroundColor: 'transparent',
                transform: [{ rotate: '225deg' }],
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" iconStyle={{ left: 2, top: 6 }} />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                backgroundColor: 'transparent',
              }}
            >
              {loc.send.header.toLowerCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class ManageFundsBigButton extends Component {
  render() {
    return (
      <TouchableOpacity {...this.props}>
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              minWidth: 160,
              minHeight: 40,
              backgroundColor: '#ccddf9',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: 'transparent',
                transform: [{ rotate: '90deg' }],
                marginHorizontal: 10,
              }}
            >
              <Icon {...this.props} name="link" size={16} type="font-awesome" color="#2f5fb3" />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                backgroundColor: 'transparent',
              }}
            >
              {loc.lnd.title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BluePlusIconDimmed extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.box1}>
          <View style={stylesBlueIcon.ballDimmed}>
            <Ionicons
              {...this.props}
              name={'ios-add'}
              size={26}
              style={{
                color: 'white',
                backgroundColor: 'transparent',
                left: 8,
                top: 1,
              }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class NewWalletPanel extends Component {
  constructor(props) {
    super(props);
    // WalletsCarousel.handleClick = props.handleClick // because cant access `this` from _renderItem
    // eslint-disable-next-line
    this.handleClick = props.onPress;
  }

  render() {
    return (
      <TouchableOpacity
        {...this.props}
        onPress={() => {
          if (this.handleClick) {
            this.handleClick();
          }
        }}
        style={{ marginVertical: 17 }}
      >
        <LinearGradient
          colors={['#eef0f4', '#eef0f4']}
          style={{
            padding: 15,
            borderRadius: 10,
            minHeight: 164,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BluePlusIconDimmed />
          <Text
            style={{
              backgroundColor: 'transparent',
              fontWeight: 'bold',
              fontSize: 20,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet}
          </Text>
          <Text style={{ backgroundColor: 'transparent' }} />
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet1}
          </Text>
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet2}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
}

const sliderWidth = width * 1;
const itemWidth = width * 0.82;
const sliderHeight = 190;

export class WalletsCarousel extends Component {
  constructor(props) {
    super(props);
    // eslint-disable-next-line
    WalletsCarousel.handleClick = props.handleClick; // because cant access `this` from _renderItem
    WalletsCarousel.handleLongPress = props.handleLongPress;
    // eslint-disable-next-line
    this.onSnapToItem = props.onSnapToItem;
  }

  _renderItem({ item, index }) {
    let scaleValue = new Animated.Value(1.0);

    this.onPressedIn = () => {
      Animated.spring(scaleValue, { toValue: 0.9, duration: 100, useNativeDriver: Platform.OS === 'android' }).start();
    };
    this.onPressedOut = () => {
      Animated.spring(scaleValue, { toValue: 1.0, duration: 100, useNativeDriver: Platform.OS === 'android' }).start();
    };

    if (!item) {
      return (
        <NewWalletPanel
          onPress={() => {
            if (WalletsCarousel.handleClick) {
              WalletsCarousel.handleClick(index);
            }
          }}
        />
      );
    }

    let gradient1 = '#65ceef';
    let gradient2 = '#68bbe1';

    if (WatchOnlyWallet.type === item.type) {
      gradient1 = '#7d7d7d';
      gradient2 = '#4a4a4a';
    }

    if (LegacyWallet.type === item.type) {
      gradient1 = '#40fad1';
      gradient2 = '#15be98';
    }

    if (HDLegacyP2PKHWallet.type === item.type) {
      gradient1 = '#e36dfa';
      gradient2 = '#bd10e0';
    }

    if (HDLegacyBreadwalletWallet.type === item.type) {
      gradient1 = '#fe6381';
      gradient2 = '#f99c42';
    }

    if (HDSegwitP2SHWallet.type === item.type) {
      gradient1 = '#c65afb';
      gradient2 = '#9053fe';
    }

    if (LightningCustodianWallet.type === item.type) {
      gradient1 = '#f1be07';
      gradient2 = '#f79056';
    }

    return (
      <Animated.View
        style={{ paddingRight: 10, marginVertical: 17, transform: [{ scale: scaleValue }] }}
        shadowOpacity={40 / 100}
        shadowOffset={{ width: 0, height: 0 }}
        shadowRadius={5}
      >
        <TouchableWithoutFeedback
          onPressIn={this.onPressedIn}
          onPressOut={this.onPressedOut}
          onLongPress={WalletsCarousel.handleLongPress}
          onPress={() => {
            if (WalletsCarousel.handleClick) {
              WalletsCarousel.handleClick(index, [gradient1, gradient2]);
            }
          }}
        >
          <LinearGradient
            shadowColor="#000000"
            colors={[gradient1, gradient2]}
            style={{
              padding: 15,
              borderRadius: 10,
              minHeight: 164,
              elevation: 5,
            }}
          >
            <Image
              source={(LightningCustodianWallet.type === item.type && require('./img/lnd-shape.png')) || require('./img/btc-shape.png')}
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
                color: '#fff',
              }}
            >
              {item.getLabel()}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 36,
                color: '#fff',
              }}
            >
              {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit())}
            </Text>
            <Text style={{ backgroundColor: 'transparent' }} />
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontSize: 13,
                color: '#fff',
              }}
            >
              {loc.wallets.list.latest_transaction}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 16,
                color: '#fff',
              }}
            >
              {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }

  render() {
    return (
      <Carousel
        {...this.props}
        ref={c => {
          WalletsCarousel.carousel = c;
        }}
        renderItem={this._renderItem}
        sliderWidth={sliderWidth}
        sliderHeight={sliderHeight}
        itemWidth={itemWidth}
        inactiveSlideScale={1}
        inactiveSlideOpacity={0.7}
        contentContainerCustomStyle={{ left: -20 }}
        onSnapToItem={index => {
          if (this.onSnapToItem) {
            this.onSnapToItem(index);
          }
          console.log('snapped to card #', index);
        }}
      />
    );
  }
}

export class BlueBitcoinAmount extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChangeText: PropTypes.func,
    disabled: PropTypes.bool,
  };

  render() {
    const amount = typeof this.props.amount === 'number' ? this.props.amount.toString() : this.props.amount;

    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
          <TextInput
            keyboardType="numeric"
            onChangeText={text => this.props.onChangeText(text.replace(',', '.'))}
            placeholder="0"
            maxLength={10}
            editable={!this.props.isLoading && !this.props.disabled}
            value={amount}
            placeholderTextColor={this.props.disabled ? '#99a0ab' : '#0f5cc0'}
            style={{
              color: this.props.disabled ? '#99a0ab' : '#0f5cc0',
              fontSize: 36,
              fontWeight: '600',
            }}
          />
          <Text
            style={{
              color: this.props.disabled ? '#99a0ab' : '#0f5cc0',
              fontSize: 16,
              marginHorizontal: 4,
              paddingBottom: 6,
              fontWeight: '600',
              alignSelf: 'flex-end',
            }}
          >
            {' ' + BitcoinUnit.BTC}
          </Text>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 4 }}>
          <Text style={{ fontSize: 18, color: '#d4d4d4', fontWeight: '600' }}>
            {loc.formatBalance(amount || 0, BitcoinUnit.LOCAL_CURRENCY)}
          </Text>
        </View>
      </View>
    );
  }
}
