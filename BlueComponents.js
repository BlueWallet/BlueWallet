/* eslint react/prop-types: 0 */
/* global alert */
/** @type {AppStorage} */
import React, { Component } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { Icon, FormLabel, FormInput, Text, Header, List, ListItem } from 'react-native-elements';
import {
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  View,
  UIManager,
  StyleSheet,
  Dimensions,
  Image,
  Keyboard,
  SafeAreaView,
  InputAccessoryView,
  Clipboard,
  Platform,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet } from './class';
import Carousel from 'react-native-snap-carousel';
import DeviceInfo from 'react-native-device-info';
import { BitcoinUnit } from './models/bitcoinUnits';
import NavigationService from './NavigationService';
import ImagePicker from 'react-native-image-picker';
import WalletGradient from './class/walletGradient';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
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
    let backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : '#ccddf9';
    let fontColor = '#0c2550';
    if (this.props.hasOwnProperty('disabled') && this.props.disabled === true) {
      backgroundColor = '#eef0f4';
      fontColor = '#9aa0aa';
    }
    return (
      <TouchableOpacity
        style={{
          flex: 1,
          borderWidth: 0.7,
          borderColor: 'transparent',
          backgroundColor: backgroundColor,
          minHeight: 45,
          height: 45,
          maxHeight: 45,
          borderRadius: 25,
          minWidth: width / 1.5,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        {...this.props}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          {this.props.icon && <Icon name={this.props.icon.name} type={this.props.icon.type} color={this.props.icon.color} />}
          {this.props.title && <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{this.props.title}</Text>}
        </View>
      </TouchableOpacity>
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
    return (
      <TouchableOpacity
        style={{
          minHeight: 60,
          minWidth: 100,
          height: 60,
          justifyContent: 'center',
        }}
        {...this.props}
      >
        <Text style={{ color: '#0c2550', textAlign: 'center', fontSize: 16 }}>{this.props.title}</Text>
      </TouchableOpacity>
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
      onPress={
        customCloseButtonFunction === undefined
          ? () => {
              Keyboard.dismiss();
              navigation.goBack(null);
            }
          : customCloseButtonFunction
      }
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

export class BlueCopyTextToClipboard extends Component {
  static propTypes = {
    text: PropTypes.string,
  };

  static defaultProps = {
    text: '',
  };

  constructor(props) {
    super(props);
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    this.state = { hasTappedText: false, address: props.text };
  }

  copyToClipboard = () => {
    this.setState({ hasTappedText: true }, () => {
      Clipboard.setString(this.props.text);
      this.setState({ address: loc.wallets.xpub.copiedToClipboard }, () => {
        setTimeout(() => {
          this.setState({ hasTappedText: false, address: this.props.text });
        }, 1000);
      });
    });
  };

  render() {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={this.copyToClipboard} disabled={this.state.hasTappedText}>
          <Animated.Text style={styleCopyTextToClipboard.address} numberOfLines={0}>
            {this.state.address}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styleCopyTextToClipboard = StyleSheet.create({
  address: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
});

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
        style={{
          color: BlueApp.settings.foregroundColor,

          // eslint-disable-next-line
          ...this.props.style,
        }}
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

export class BlueUseAllFundsButton extends Component {
  static InputAccessoryViewID = 'useMaxInputAccessoryViewID';
  static propTypes = {
    wallet: PropTypes.shape().isRequired,
    onUseAllPressed: PropTypes.func.isRequired,
  };

  render() {
    return (
      <InputAccessoryView nativeID={BlueUseAllFundsButton.InputAccessoryViewID}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#9aa0aa', fontSize: 16, marginHorizontal: 8 }}>
            Total: {this.props.wallet.getBalance()} {BitcoinUnit.BTC}
          </Text>
          <BlueButtonLink title="Use All" onPress={this.props.onUseAllPressed} />
        </View>
      </InputAccessoryView>
    );
  }
}

export class BlueDismissKeyboardInputAccessory extends Component {
  static InputAccessoryViewID = 'BlueDismissKeyboardInputAccessory';

  render() {
    return (
      <InputAccessoryView nativeID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}>
        <View
          style={{
            backgroundColor: '#eef0f4',
            height: 44,
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <BlueButtonLink title="Done" onPress={Keyboard.dismiss} />
        </View>
      </InputAccessoryView>
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
  boxIncoming: {
    position: 'relative',
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccddf9',
  },
  ballIncoming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d2f8d6',
    transform: [{ rotate: '-45deg' }],
  },
  ballIncomingWithoutRotate: {
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

export class BlueTransactionIncomingIcon extends Component {
  render() {
    return (
      <View {...this.props}>
        <View style={stylesBlueIcon.boxIncoming}>
          <View style={stylesBlueIcon.ballIncoming}>
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
        <View style={stylesBlueIcon.boxIncoming}>
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
        <View style={stylesBlueIcon.boxIncoming}>
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
        <View style={stylesBlueIcon.boxIncoming}>
          <View style={stylesBlueIcon.ballIncoming}>
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
        <View style={stylesBlueIcon.boxIncoming}>
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
        <View style={stylesBlueIcon.boxIncoming}>
          <View style={stylesBlueIcon.ballIncomingWithoutRotate}>
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
        <View style={stylesBlueIcon.boxIncoming}>
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
        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#ccddf9',
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                minWidth: 30,
                minHeight: 30,
                left: 5,
                backgroundColor: 'transparent',
                transform: [{ rotate: '-45deg' }],
                alignItems: 'center',
                marginBottom: -11,
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" />
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
              {loc.receive.header}
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
        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#ccddf9',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                minWidth: 30,
                minHeight: 30,
                left: 5,
                backgroundColor: 'transparent',
                transform: [{ rotate: '225deg' }],
                marginBottom: 11,
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                backgroundColor: 'transparent',
              }}
            >
              {loc.send.header}
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
        <View
          style={{
            flex: 1,
            width: 168,
            backgroundColor: '#ccddf9',
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                minWidth: 30,
                minHeight: 30,
                right: 5,
                backgroundColor: 'transparent',
                transform: [{ rotate: '90deg' }],
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
          colors={WalletGradient.createWallet}
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

export class BlueTransactionListItem extends Component {
  static propTypes = {
    item: PropTypes.shape().isRequired,
    itemPriceUnit: PropTypes.string,
  };

  static defaultProps = {
    itemPriceUnit: BitcoinUnit.BTC,
  };

  txMemo = () => {
    if (BlueApp.tx_metadata[this.props.item.hash] && BlueApp.tx_metadata[this.props.item.hash]['memo']) {
      return BlueApp.tx_metadata[this.props.item.hash]['memo'];
    }
    return '';
  };

  rowTitle = () => {
    const item = this.props.item;
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (isNaN(item.value)) {
        item.value = '0';
      }
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
    }
  };

  rowTitleStyle = () => {
    const item = this.props.item;
    let color = '#37c0a1';

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = '#37c0a1';
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = '#37c0a1';
        } else {
          color = '#FF0000';
        }
      }
    } else if (item.value / 100000000 < 0) {
      color = BlueApp.settings.foregroundColor;
    }

    return {
      fontWeight: '600',
      fontSize: 16,
      color: color,
    };
  };

  avatar = () => {
    // is it lightning refill tx?
    if (this.props.item.category === 'receive' && this.props.item.confirmations < 3) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    }

    if (this.props.item.type && this.props.item.type === 'bitcoind_tx') {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOnchainIcon />
        </View>
      );
    }
    if (this.props.item.type === 'paid_invoice') {
      // is it lightning offchain payment?
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOffchainIcon />
        </View>
      );
    }

    if (this.props.item.type === 'user_invoice' || this.props.item.type === 'payment_request') {
      if (!this.props.item.ispaid) {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0;
        const invoiceExpiration = this.props.item.timestamp + this.props.item.expire_time;
        if (invoiceExpiration < now) {
          return (
            <View style={{ width: 25 }}>
              <BlueTransactionExpiredIcon />
            </View>
          );
        }
      } else {
        return (
          <View style={{ width: 25 }}>
            <BlueTransactionOffchainIncomingIcon />
          </View>
        );
      }
    }

    if (!this.props.item.confirmations) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    } else if (this.props.item.value < 0) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOutgoingIcon />
        </View>
      );
    } else {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionIncomingIcon />
        </View>
      );
    }
  };

  subtitle = () => {
    return (
      (this.props.item.confirmations < 7 ? loc.transactions.list.conf + ': ' + this.props.item.confirmations + ' ' : '') +
      this.txMemo() +
      (this.props.item.memo || '')
    );
  };

  onPress = () => {
    if (this.props.item.hash) {
      NavigationService.navigate('TransactionDetails', { hash: this.props.item.hash });
    } else if (
      this.props.item.type === 'user_invoice' ||
      this.props.item.type === 'payment_request' ||
      this.props.item.type === 'paid_invoice'
    ) {
      const lightningWallet = BlueApp.getWallets().filter(wallet => {
        if (typeof wallet === 'object') {
          if (wallet.hasOwnProperty('secret')) {
            return wallet.getSecret() === this.props.item.fromWallet;
          }
        }
      });
      if (lightningWallet.length === 1) {
        NavigationService.navigate('LNDViewInvoice', {
          invoice: this.props.item,
          fromWallet: lightningWallet[0],
          isModal: false,
        });
      }
    }
  };

  render() {
    return (
      <BlueListItem
        avatar={this.avatar()}
        title={loc.transactionTimeToReadable(this.props.item.received)}
        subtitle={this.subtitle()}
        onPress={this.onPress}
        badge={{
          value: 3,
          textStyle: { color: 'orange' },
          containerStyle: { marginTop: 0 },
        }}
        hideChevron
        rightTitle={this.rowTitle()}
        rightTitleStyle={this.rowTitleStyle()}
      />
    );
  }
}

export class BlueListTransactionItem extends Component {
  static propTypes = {
    item: PropTypes.shape().isRequired,
    itemPriceUnit: PropTypes.string,
  };

  static defaultProps = {
    itemPriceUnit: BitcoinUnit.BTC,
  };

  txMemo = () => {
    if (BlueApp.tx_metadata[this.props.item.hash] && BlueApp.tx_metadata[this.props.item.hash]['memo']) {
      return BlueApp.tx_metadata[this.props.item.hash]['memo'];
    }
    return '';
  };

  rowTitle = () => {
    const item = this.props.item;
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (isNaN(item.value)) {
        item.value = '0';
      }
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return loc.formatBalanceWithoutSuffix(item.value && item.value, this.props.itemPriceUnit, true).toString();
    }
  };

  rowTitleStyle = () => {
    const item = this.props.item;
    let color = '#37c0a1';

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = '#37c0a1';
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = '#37c0a1';
        } else {
          color = '#FF0000';
        }
      }
    } else if (item.value / 100000000 < 0) {
      color = BlueApp.settings.foregroundColor;
    }

    return {
      fontWeight: '600',
      fontSize: 16,
      color: color,
    };
  };

  avatar = () => {
    // is it lightning refill tx?
    if (this.props.item.category === 'receive' && this.props.item.confirmations < 3) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    }

    if (this.props.item.type && this.props.item.type === 'bitcoind_tx') {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOnchainIcon />
        </View>
      );
    }
    if (this.props.item.type === 'paid_invoice') {
      // is it lightning offchain payment?
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOffchainIcon />
        </View>
      );
    }

    if (this.props.item.type === 'user_invoice' || this.props.item.type === 'payment_request') {
      if (!this.props.item.ispaid) {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0;
        const invoiceExpiration = this.props.item.timestamp + this.props.item.expire_time;
        if (invoiceExpiration < now) {
          return (
            <View style={{ width: 25 }}>
              <BlueTransactionExpiredIcon />
            </View>
          );
        }
      } else {
        return (
          <View style={{ width: 25 }}>
            <BlueTransactionOffchainIncomingIcon />
          </View>
        );
      }
    }

    if (!this.props.item.confirmations) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    } else if (this.props.item.value < 0) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOutgoingIcon />
        </View>
      );
    } else {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionIncomingIcon />
        </View>
      );
    }
  };

  subtitle = () => {
    return (
      (this.props.item.confirmations < 7 ? loc.transactions.list.conf + ': ' + this.props.item.confirmations + ' ' : '') +
      this.txMemo() +
      (this.props.item.memo || '')
    );
  };

  onPress = () => {
    if (this.props.item.hash) {
      NavigationService.navigate('TransactionDetails', { hash: this.props.item.hash });
    } else if (
      this.props.item.type === 'user_invoice' ||
      this.props.item.type === 'payment_request' ||
      this.props.item.type === 'paid_invoice'
    ) {
      const lightningWallet = BlueApp.getWallets().filter(wallet => {
        if (typeof wallet === 'object') {
          if (wallet.hasOwnProperty('secret')) {
            return wallet.getSecret() === this.props.item.fromWallet;
          }
        }
      });
      NavigationService.navigate('LNDViewInvoice', {
        invoice: this.props.item,
        fromWallet: lightningWallet[0],
        isModal: false,
      });
    }
  };

  render() {
    return (
      <BlueListItem
        avatar={this.avatar()}
        title={loc.transactionTimeToReadable(this.props.item.received)}
        subtitle={this.subtitle()}
        onPress={this.onPress}
        badge={{
          value: 3,
          textStyle: { color: 'orange' },
          containerStyle: { marginTop: 0 },
        }}
        hideChevron
        rightTitle={this.rowTitle()}
        rightTitleStyle={this.rowTitleStyle()}
      />
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
    let props = { duration: 50 };
    if (Platform.OS === 'android') {
      props['useNativeDriver'] = true;
    }
    this.onPressedIn = () => {
      props.toValue = 0.9;
      Animated.spring(scaleValue, props).start();
    };
    this.onPressedOut = () => {
      props.toValue = 1.0;
      Animated.spring(scaleValue, props).start();
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
              WalletsCarousel.handleClick(index);
            }
          }}
        >
          <LinearGradient
            shadowColor="#000000"
            colors={WalletGradient.gradientsFor(item.type)}
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
              {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
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

export class BlueAddressInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    onChangeText: PropTypes.func,
    onBarScanned: PropTypes.func,
    address: PropTypes.string,
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    isLoading: false,
    address: '',
    placeholder: loc.send.details.address,
  };

  render() {
    return (
      <View
        style={{
          flexDirection: 'row',
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 1.0,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
          minHeight: 44,
          height: 44,
          marginHorizontal: 20,
          alignItems: 'center',
          marginVertical: 8,
          borderRadius: 4,
        }}
      >
        <TextInput
          onChangeText={text => {
            this.props.onChangeText(text);
          }}
          placeholder={this.props.placeholder}
          numberOfLines={1}
          value={this.props.address}
          style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
          editable={!this.props.isLoading}
          onSubmitEditing={Keyboard.dismiss}
          {...this.props}
        />
        <TouchableOpacity
          disabled={this.props.isLoading}
          onPress={() => {
            Keyboard.dismiss();
            ImagePicker.showImagePicker(
              {
                title: null,
                mediaType: 'photo',
                takePhotoButtonTitle: null,
                customButtons: [{ name: 'navigatetoQRScan', title: 'Use Camera' }],
              },
              response => {
                if (response.customButton) {
                  NavigationService.navigate('ScanQrAddress', { onBarScanned: this.props.onBarScanned });
                } else if (response.uri) {
                  const uri = response.uri.toString().replace('file://', '');
                  LocalQRCode.decode(uri, (error, result) => {
                    if (!error) {
                      this.props.onBarScanned(result);
                    } else {
                      alert('The selected image does not contain a QR Code.');
                    }
                  });
                }
              },
            );
          }}
          style={{
            width: 75,
            height: 36,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#bebebe',
            borderRadius: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginHorizontal: 4,
          }}
        >
          <Icon name="qrcode" size={22} type="font-awesome" color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF' }}>{loc.send.details.scan}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export class BlueBitcoinAmount extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChangeText: PropTypes.func,
    disabled: PropTypes.bool,
    unit: PropTypes.string,
  };

  static defaultProps = {
    unit: BitcoinUnit.BTC,
  };

  render() {
    const amount = typeof this.props.amount === 'number' ? this.props.amount.toString() : this.props.amount;

    return (
      <TouchableWithoutFeedback disabled={this.props.pointerEvents === 'none'} onPress={() => this.textInput.focus()}>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
            <TextInput
              {...this.props}
              keyboardType="numeric"
              onChangeText={text => {
                text = text.replace(',', '.');
                text = this.props.unit === BitcoinUnit.BTC ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');
                text = text.replace(/(\..*)\./g, '$1');
                if (text.startsWith('.')) {
                  text = '0.';
                }
                this.props.onChangeText(text);
              }}
              placeholder="0"
              maxLength={10}
              ref={textInput => (this.textInput = textInput)}
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
              {' ' + this.props.unit}
            </Text>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 4 }}>
            <Text style={{ fontSize: 18, color: '#d4d4d4', fontWeight: '600' }}>
              {loc.formatBalance(
                this.props.unit === BitcoinUnit.BTC ? amount || 0 : loc.formatBalanceWithoutSuffix(amount || 0, BitcoinUnit.BTC, false),
                BitcoinUnit.LOCAL_CURRENCY,
                false,
              )}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}
