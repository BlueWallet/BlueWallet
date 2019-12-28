/* eslint react/prop-types: 0 */
import React, { Component, useEffect, useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { Icon, FormLabel, FormInput, Text, Header, List, ListItem } from 'react-native-elements';
import {
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
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
import { LightningCustodianWallet, PlaceholderWallet } from './class';
import Carousel from 'react-native-snap-carousel';
import { BitcoinUnit } from './models/bitcoinUnits';
import NavigationService from './NavigationService';
import WalletGradient from './class/walletGradient';
import ToolTip from 'react-native-tooltip';
import { BlurView } from '@react-native-community/blur';
import showPopupMenu from 'react-native-popup-menu-android';
import NetworkTransactionFees, { NetworkTransactionFeeType } from './models/networkTransactionFees';
import Biometric from './class/biometrics';
let loc = require('./loc/');
/** @type {AppStorage} */
let BlueApp = require('./BlueApp');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
const BigNumber = require('bignumber.js');
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export class BlueButton extends Component {
  render() {
    let backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : BlueApp.settings.buttonBackgroundColor;
    let fontColor = BlueApp.settings.buttonTextColor;
    if (this.props.hasOwnProperty('disabled') && this.props.disabled === true) {
      backgroundColor = BlueApp.settings.buttonDisabledBackgroundColor;
      fontColor = BlueApp.settings.buttonDisabledTextColor;
    }
    let buttonWidth = this.props.width ? this.props.width : width / 1.5;
    if (this.props.hasOwnProperty('noMinWidth')) {
      buttonWidth = 0;
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
          minWidth: buttonWidth,
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
            borderColor: BlueApp.settings.hdborderColor,
            borderWidth: 1,
            borderRadius: 5,
            backgroundColor: (this.props.active && BlueApp.settings.hdbackgroundColor) || BlueApp.settings.brandingColor,
            // eslint-disable-next-line
            minWidth: this.props.style.width,
            // eslint-disable-next-line
            minHeight: this.props.style.height,
            height: this.props.style.height,
            flex: 1,
          }}
        >
          <View style={{ marginTop: 16, marginLeft: 16, marginBottom: 16 }}>
            <Text style={{ color: BlueApp.settings.hdborderColor, fontWeight: 'bold' }}>{loc.wallets.add.bitcoin}</Text>
          </View>
          <Image
            style={{ width: 34, height: 34, marginRight: 8, marginBottom: 8, justifyContent: 'flex-end', alignSelf: 'flex-end' }}
            source={require('./img/addWallet/bitcoin.png')}
          />
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
            borderColor: BlueApp.settings.lnborderColor,
            borderWidth: 1,
            borderRadius: 5,
            backgroundColor: (this.props.active && BlueApp.settings.lnbackgroundColor) || BlueApp.settings.brandingColor,
            // eslint-disable-next-line
            minWidth: this.props.style.width,
            // eslint-disable-next-line
            minHeight: this.props.style.height,
            height: this.props.style.height,
            flex: 1,
          }}
        >
          <View style={{ marginTop: 16, marginLeft: 16, marginBottom: 16 }}>
            <Text style={{ color: BlueApp.settings.lnborderColor, fontWeight: 'bold' }}>{loc.wallets.add.lightning}</Text>
          </View>
          <Image
            style={{ width: 34, height: 34, marginRight: 8, marginBottom: 8, justifyContent: 'flex-end', alignSelf: 'flex-end' }}
            source={require('./img/addWallet/lightning.png')}
          />
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueWalletNavigationHeader extends Component {
  static propTypes = {
    wallet: PropTypes.shape().isRequired,
    onWalletUnitChange: PropTypes.func,
  };

  static getDerivedStateFromProps(props, state) {
    return { wallet: props.wallet, onWalletUnitChange: props.onWalletUnitChange, allowOnchainAddress: state.allowOnchainAddress };
  }

  constructor(props) {
    super(props);
    this.state = {
      wallet: props.wallet,
      walletPreviousPreferredUnit: props.wallet.getPreferredBalanceUnit(),
      showManageFundsButton: false,
    };
  }

  handleCopyPress = _item => {
    Clipboard.setString(loc.formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit()).toString());
  };

  componentDidMount() {
    if (this.state.wallet.type === LightningCustodianWallet.type) {
      this.state.wallet
        .allowOnchainAddress()
        .then(value => this.setState({ allowOnchainAddress: value }))
        .catch(e => console.log('This Lndhub wallet does not have an onchain address API.'));
    }
  }

  handleBalanceVisibility = async _item => {
    const wallet = this.state.wallet;

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled && wallet.hideBalance) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return this.props.navigation.goBack();
      }
    }

    wallet.hideBalance = !wallet.hideBalance;
    this.setState({ wallet });
    await BlueApp.saveToDisk();
  };

  showAndroidTooltip = () => {
    showPopupMenu(this.toolTipMenuOptions(), this.handleToolTipSelection, this.walletBalanceText);
  };

  handleToolTipSelection = item => {
    if (item === loc.transactions.details.copy || item.id === loc.transactions.details.copy) {
      this.handleCopyPress();
    } else if (item === 'balancePrivacy' || item.id === 'balancePrivacy') {
      this.handleBalanceVisibility();
    }
  };

  toolTipMenuOptions() {
    return Platform.select({
      // NOT WORKING ATM.
      // ios: [
      //   { text: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance', onPress: this.handleBalanceVisibility },
      //   { text: loc.transactions.details.copy, onPress: this.handleCopyPress },
      // ],
      android: this.state.wallet.hideBalance
        ? [{ id: 'balancePrivacy', label: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance' }]
        : [
            { id: 'balancePrivacy', label: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance' },
            { id: loc.transactions.details.copy, label: loc.transactions.details.copy },
          ],
    });
  }

  changeWalletBalanceUnit() {
    let walletPreviousPreferredUnit = this.state.wallet.getPreferredBalanceUnit();
    const wallet = this.state.wallet;
    if (walletPreviousPreferredUnit === BitcoinUnit.BTC) {
      wallet.preferredBalanceUnit = BitcoinUnit.SATS;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    } else if (walletPreviousPreferredUnit === BitcoinUnit.SATS) {
      wallet.preferredBalanceUnit = BitcoinUnit.LOCAL_CURRENCY;
      walletPreviousPreferredUnit = BitcoinUnit.SATS;
    } else if (walletPreviousPreferredUnit === BitcoinUnit.LOCAL_CURRENCY) {
      wallet.preferredBalanceUnit = BitcoinUnit.BTC;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    } else {
      wallet.preferredBalanceUnit = BitcoinUnit.BTC;
      walletPreviousPreferredUnit = BitcoinUnit.BTC;
    }

    this.setState({ wallet, walletPreviousPreferredUnit: walletPreviousPreferredUnit }, () => {
      this.props.onWalletUnitChange(wallet);
    });
  }

  manageFundsPressed = () => {
    this.props.onManageFundsPressed();
  };

  render() {
    return (
      <LinearGradient
        colors={WalletGradient.gradientsFor(this.state.wallet.type)}
        style={{ padding: 15, minHeight: 140, justifyContent: 'center' }}
      >
        <Image
          source={
            (LightningCustodianWallet.type === this.state.wallet.type && require('./img/lnd-shape.png')) || require('./img/btc-shape.png')
          }
          style={{
            width: 99,
            height: 94,
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />

        <Text
          numberOfLines={1}
          style={{
            backgroundColor: 'transparent',
            fontSize: 19,
            color: '#fff',
          }}
        >
          {this.state.wallet.getLabel()}
        </Text>
        {Platform.OS === 'ios' && (
          <ToolTip
            ref={tooltip => (this.tooltip = tooltip)}
            actions={
              this.state.wallet.hideBalance
                ? [{ text: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance', onPress: this.handleBalanceVisibility }]
                : [
                    { text: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance', onPress: this.handleBalanceVisibility },
                    { text: loc.transactions.details.copy, onPress: this.handleCopyPress },
                  ]
            }
          />
        )}
        <TouchableOpacity
          style={styles.balance}
          onPress={() => this.changeWalletBalanceUnit()}
          ref={ref => (this.walletBalanceText = ref)}
          onLongPress={() => (Platform.OS === 'ios' ? this.tooltip.showMenu() : this.showAndroidTooltip())}
        >
          {this.state.wallet.hideBalance ? (
            <BluePrivateBalance />
          ) : (
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
              {loc.formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit(), true).toString()}
            </Text>
          )}
        </TouchableOpacity>
        {this.state.wallet.type === LightningCustodianWallet.type && this.state.allowOnchainAddress && (
          <TouchableOpacity onPress={this.manageFundsPressed}>
            <View
              style={{
                marginTop: 14,
                marginBottom: 10,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 9,
                minWidth: 119,
                minHeight: 39,
                width: 119,
                height: 39,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontWeight: '500',
                  fontSize: 14,
                  color: '#FFFFFF',
                }}
              >
                {loc.lnd.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>
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
        <Text style={{ color: BlueApp.settings.foregroundColor, textAlign: 'center', fontSize: 16 }}>{this.props.title}</Text>
      </TouchableOpacity>
    );
  }
}

export const BlueAlertWalletExportReminder = ({ onSuccess = () => {}, onFailure }) => {
  Alert.alert(
    'Wallet',
    `Have your saved your wallet's backup phrase? This backup phrase is required to access your funds in case you lose this device. Without the backup phrase, your funds will be permanently lost.`,
    [
      { text: 'Yes, I have', onPress: onSuccess, style: 'cancel' },
      {
        text: 'No, I have not',
        onPress: onFailure,
      },
    ],
    { cancelable: false },
  );
};

export const BlueNavigationStyle = (navigation, withNavigationCloseButton = false, customCloseButtonFunction = undefined) => ({
  headerStyle: {
    backgroundColor: BlueApp.settings.brandingColor,
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    color: BlueApp.settings.foregroundColor,
  },
  headerTintColor: BlueApp.settings.foregroundColor,
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

export const BlueCreateTxNavigationStyle = (navigation, withAdvancedOptionsMenuButton = false, advancedOptionsMenuButtonAction) => ({
  headerStyle: {
    backgroundColor: BlueApp.settings.brandingColor,
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerTitleStyle: {
    fontWeight: '600',
    color: BlueApp.settings.foregroundColor,
  },
  headerTintColor: BlueApp.settings.foregroundColor,
  headerLeft: (
    <TouchableOpacity
      style={{ minWwidth: 40, height: 40, padding: 14 }}
      onPress={() => {
        Keyboard.dismiss();
        navigation.goBack(null);
      }}
    >
      <Image style={{ alignSelf: 'center' }} source={require('./img/close.png')} />
    </TouchableOpacity>
  ),
  headerRight: withAdvancedOptionsMenuButton ? (
    <TouchableOpacity style={{ minWidth: 40, height: 40, padding: 14 }} onPress={advancedOptionsMenuButtonAction}>
      <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueApp.settings.foregroundColor} />
    </TouchableOpacity>
  ) : null,
  headerBackTitle: null,
});

export const BluePrivateBalance = () => {
  return Platform.select({
    ios: (
      <View style={{ flexDirection: 'row' }}>
        <BlurView style={styles.balanceBlur} blurType="light" blurAmount={25} />
        <Icon name="eye-slash" type="font-awesome" color="#FFFFFF" />
      </View>
    ),
    android: (
      <View style={{ flexDirection: 'row' }}>
        <View style={{ backgroundColor: '#FFFFFF', opacity: 0.5, height: 30, width: 100, marginRight: 8 }} />
        <Icon name="eye-slash" type="font-awesome" color="#FFFFFF" />
      </View>
    ),
  });
};

export const BlueCopyToClipboardButton = ({ stringToCopy, displayText = false }) => {
  return (
    <TouchableOpacity {...this.props} onPress={() => Clipboard.setString(stringToCopy)}>
      <Text style={{ fontSize: 13, fontWeight: '400', color: '#68bbe1' }}>{displayText || loc.transactions.details.copy}</Text>
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

  static getDerivedStateFromProps(props, state) {
    if (state.hasTappedText) {
      return { hasTappedText: state.hasTappedText, address: state.address };
    } else {
      return { hasTappedText: state.hasTappedText, address: props.text };
    }
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
        subtitleStyle={{ color: BlueApp.settings.alternativeTextColor }}
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
          borderColor: BlueApp.settings.inputBorderColor,
          borderBottomColor: BlueApp.settings.inputBorderColor,
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: BlueApp.settings.inputBackgroundColor,
        }}
      />
    );
  }
}

export class BlueFormMultiInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selection: { start: 0, end: 0 },
    };
  }

  render() {
    return (
      <TextInput
        multiline
        underlineColorAndroid="transparent"
        numberOfLines={4}
        style={{
          marginTop: 5,
          marginHorizontal: 20,
          borderColor: BlueApp.settings.inputBorderColor,
          borderBottomColor: BlueApp.settings.inputBorderColor,
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: BlueApp.settings.inputBackgroundColor,
          height: 200,
          color: BlueApp.settings.foregroundColor,
        }}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        {...this.props}
        selectTextOnFocus={false}
        keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
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
      <SafeAreaView style={{ backgroundColor: BlueApp.settings.brandingColor }}>
        <Header
          backgroundColor={BlueApp.settings.brandingColor}
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
      <SafeAreaView style={{ backgroundColor: BlueApp.settings.brandingColor }}>
        <Header
          {...this.props}
          backgroundColor={BlueApp.settings.brandingColor}
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
            this.props.onNewWalletPress && (
              <TouchableOpacity
                onPress={this.props.onNewWalletPress}
                style={{
                  height: 48,
                  alignSelf: 'flex-end',
                }}
              >
                <BluePlusIcon />
              </TouchableOpacity>
            )
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
}

export class BlueSpacing20 extends Component {
  render() {
    return <View {...this.props} style={{ height: 20, opacity: 0 }} />;
  }
}

export class BlueSpacing10 extends Component {
  render() {
    return <View {...this.props} style={{ height: 10, opacity: 0 }} />;
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
    const inputView = (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          maxHeight: 44,
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#eef0f4',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <Text
            style={{
              color: BlueApp.settings.alternativeTextColor,
              fontSize: 16,
              marginLeft: 8,
              marginRight: 0,
              paddingRight: 0,
              paddingLeft: 0,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            Total:
          </Text>
          {this.props.wallet.allowSendMax() && this.props.wallet.getBalance() > 0 ? (
            <BlueButtonLink
              onPress={this.props.onUseAllPressed}
              style={{ marginLeft: 8, paddingRight: 0, paddingLeft: 0, paddingTop: 12, paddingBottom: 12 }}
              title={`${loc.formatBalanceWithoutSuffix(this.props.wallet.getBalance(), BitcoinUnit.BTC, true).toString()} ${
                BitcoinUnit.BTC
              }`}
            />
          ) : (
            <Text
              style={{
                color: BlueApp.settings.alternativeTextColor,
                fontSize: 16,
                marginLeft: 8,
                marginRight: 0,
                paddingRight: 0,
                paddingLeft: 0,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              {loc.formatBalanceWithoutSuffix(this.props.wallet.getBalance(), BitcoinUnit.BTC, true).toString()} {BitcoinUnit.BTC}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <BlueButtonLink
            style={{ paddingRight: 8, paddingLeft: 0, paddingTop: 12, paddingBottom: 12 }}
            title="Done"
            onPress={() => Keyboard.dismiss()}
          />
        </View>
      </View>
    );
    if (Platform.OS === 'ios') {
      return <InputAccessoryView nativeID={BlueUseAllFundsButton.InputAccessoryViewID}>{inputView}</InputAccessoryView>;
    } else {
      return <KeyboardAvoidingView style={{ height: 44 }}>{inputView}</KeyboardAvoidingView>;
    }
  }
}

export class BlueDismissKeyboardInputAccessory extends Component {
  static InputAccessoryViewID = 'BlueDismissKeyboardInputAccessory';

  render() {
    return Platform.OS !== 'ios' ? null : (
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
          <BlueButtonLink title="Done" onPress={() => Keyboard.dismiss()} />
        </View>
      </InputAccessoryView>
    );
  }
}

export class BlueDoneAndDismissKeyboardInputAccessory extends Component {
  static InputAccessoryViewID = 'BlueDoneAndDismissKeyboardInputAccessory';

  onPasteTapped = async () => {
    const clipboard = await Clipboard.getString();
    this.props.onPasteTapped(clipboard);
  };

  render() {
    const inputView = (
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
        <BlueButtonLink title="Clear" onPress={this.props.onClearTapped} />
        <BlueButtonLink title="Paste" onPress={this.onPasteTapped} />
        <BlueButtonLink title="Done" onPress={() => Keyboard.dismiss()} />
      </View>
    );

    if (Platform.OS === 'ios') {
      return <InputAccessoryView nativeID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}>{inputView}</InputAccessoryView>;
    } else {
      return <KeyboardAvoidingView style={{ height: 44 }}>{inputView}</KeyboardAvoidingView>;
    }
  }
}

export class BlueLoading extends Component {
  render() {
    return (
      <SafeBlueArea>
        <View style={{ flex: 1, paddingTop: 200 }} {...this.props}>
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
            <Icon
              {...this.props}
              name="arrow-down"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.incomingForegroundColor}
              iconStyle={{ left: 0, top: 8 }}
            />
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
              name="kebab-horizontal"
              size={16}
              type="octicon"
              color={BlueApp.settings.foregroundColor}
              iconStyle={{ left: 0, top: 7 }}
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
            <Icon
              {...this.props}
              name="hourglass-end"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.outgoingForegroundColor}
              iconStyle={{ left: 0, top: 6 }}
            />
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
              color={BlueApp.settings.incomingForegroundColor}
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
            <Icon
              {...this.props}
              name="bolt"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.outgoingForegroundColor}
              iconStyle={{ left: 0, top: 7 }}
            />
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
            <Icon
              {...this.props}
              name="bolt"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.incomingForegroundColor}
              iconStyle={{ left: 0, top: 7 }}
            />
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
            <Icon
              {...this.props}
              name="arrow-down"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.outgoingForegroundColor}
              iconStyle={{ left: 0, top: 8 }}
            />
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
            backgroundColor: BlueApp.settings.buttonBackgroundColor,
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
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color={BlueApp.settings.buttonAlternativeTextColor} />
            </View>
            <Text
              style={{
                color: BlueApp.settings.buttonAlternativeTextColor,
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
            backgroundColor: BlueApp.settings.buttonBackgroundColor,
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
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color={BlueApp.settings.buttonAlternativeTextColor} />
            </View>
            <Text
              style={{
                color: BlueApp.settings.buttonAlternativeTextColor,
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
            backgroundColor: BlueApp.settings.buttonBackgroundColor,
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
              <Icon {...this.props} name="link" size={16} type="font-awesome" color={BlueApp.settings.buttonAlternativeTextColor} />
            </View>
            <Text
              style={{
                color: BlueApp.settings.buttonAlternativeTextColor,
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
              color: BlueApp.settings.alternativeTextColor,
            }}
          >
            {loc.wallets.list.create_a_wallet}
          </Text>
          <Text style={{ backgroundColor: 'transparent' }} />
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: BlueApp.settings.alternativeTextColor,
            }}
          >
            {loc.wallets.list.create_a_wallet1}
          </Text>
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: BlueApp.settings.alternativeTextColor,
            }}
          >
            {loc.wallets.list.create_a_wallet2}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
}

export const BlueTransactionListItem = ({ item, itemPriceUnit = BitcoinUnit.BTC, shouldRefresh }) => {
  const [transactionTimeToReadable, setTransactionTimeToReadable] = useState('...');
  const [subtitleNumberOfLines, setSubtitleNumberOfLines] = useState(1);
  const calculateTimeLabel = () => {
    const transactionTimeToReadable = loc.transactionTimeToReadable(item.received);
    return setTransactionTimeToReadable(transactionTimeToReadable);
  };

  useEffect(() => {
    calculateTimeLabel();
  }, [item, itemPriceUnit, shouldRefresh]);

  const txMemo = () => {
    if (BlueApp.tx_metadata[item.hash] && BlueApp.tx_metadata[item.hash]['memo']) {
      return BlueApp.tx_metadata[item.hash]['memo'];
    }
    return '';
  };

  const rowTitle = () => {
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (isNaN(item.value)) {
        item.value = '0';
      }
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        return loc.formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return loc.formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return loc.formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
    }
  };

  const rowTitleStyle = () => {
    let color = BlueApp.settings.successColor;

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = BlueApp.settings.successColor;
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = BlueApp.settings.successColor;
        } else {
          color = BlueApp.settings.failedColor;
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

  const avatar = () => {
    // is it lightning refill tx?
    if (item.category === 'receive' && item.confirmations < 3) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    }

    if (item.type && item.type === 'bitcoind_tx') {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOnchainIcon />
        </View>
      );
    }
    if (item.type === 'paid_invoice') {
      // is it lightning offchain payment?
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionOffchainIcon />
        </View>
      );
    }

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (!item.ispaid) {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0;
        const invoiceExpiration = item.timestamp + item.expire_time;
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

    if (!item.confirmations) {
      return (
        <View style={{ width: 25 }}>
          <BlueTransactionPendingIcon />
        </View>
      );
    } else if (item.value < 0) {
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

  const subtitle = () => {
    return (item.confirmations < 7 ? loc.transactions.list.conf + ': ' + item.confirmations + ' ' : '') + txMemo() + (item.memo || '');
  };

  const onPress = () => {
    if (item.hash) {
      NavigationService.navigate('TransactionStatus', { hash: item.hash });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') {
      const lightningWallet = BlueApp.getWallets().filter(wallet => {
        if (typeof wallet === 'object') {
          if (wallet.hasOwnProperty('secret')) {
            return wallet.getSecret() === item.fromWallet;
          }
        }
      });
      if (lightningWallet.length === 1) {
        NavigationService.navigate('LNDViewInvoice', {
          invoice: item,
          fromWallet: lightningWallet[0],
          isModal: false,
        });
      }
    }
  };

  const onLongPress = () => {
    if (subtitleNumberOfLines === 1) {
      setSubtitleNumberOfLines(0);
    }
  };

  return (
    <BlueListItem
      avatar={avatar()}
      title={transactionTimeToReadable}
      titleNumberOfLines={subtitleNumberOfLines}
      subtitle={subtitle()}
      subtitleNumberOfLines={subtitleNumberOfLines}
      onPress={onPress}
      onLongPress={onLongPress}
      badge={{
        value: 3,
        textStyle: { color: 'orange' },
        containerStyle: { marginTop: 0 },
      }}
      hideChevron
      rightTitle={rowTitle()}
      rightTitleStyle={rowTitleStyle()}
    />
  );
};

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
      NavigationService.navigate('TransactionStatus', { hash: this.props.item.hash });
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
  walletsCarousel = React.createRef();

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

    if (item.type === PlaceholderWallet.type) {
      return (
        <Animated.View
          style={{ paddingRight: 10, marginVertical: 17, transform: [{ scale: scaleValue }] }}
          shadowOpacity={40 / 100}
          shadowOffset={{ width: 0, height: 0 }}
          shadowRadius={5}
        >
          <TouchableWithoutFeedback
            onPressIn={item.getIsFailure() ? this.onPressedIn : null}
            onPressOut={item.getIsFailure() ? this.onPressedOut : null}
            onPress={() => {
              if (item.getIsFailure() && WalletsCarousel.handleClick) {
                WalletsCarousel.handleClick(index);
              }
            }}
          >
            <LinearGradient
              shadowColor={BlueApp.settings.shadowColor}
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
                  color: BlueApp.settings.inverseForegroundColor,
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
                    color: BlueApp.settings.inverseForegroundColor,
                  }}
                >
                  An error was encountered when attempting to import this wallet.
                </Text>
              ) : (
                <ActivityIndicator style={{ marginTop: 40 }} />
              )}
            </LinearGradient>
          </TouchableWithoutFeedback>
        </Animated.View>
      );
    } else {
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
              shadowColor={BlueApp.settings.shadowColor}
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
                  color: BlueApp.settings.inverseForegroundColor,
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
                    color: BlueApp.settings.inverseForegroundColor,
                  }}
                >
                  {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
                </Text>
              )}
              <Text style={{ backgroundColor: 'transparent' }} />
              <Text
                numberOfLines={1}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: 13,
                  color: BlueApp.settings.inverseForegroundColor,
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
                  color: BlueApp.settings.inverseForegroundColor,
                }}
              >
                {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
              </Text>
            </LinearGradient>
          </TouchableWithoutFeedback>
        </Animated.View>
      );
    }
  }

  snapToItem = item => {
    this.walletsCarousel.current.snapToItem(item);
  };

  render() {
    return (
      <Carousel
        {...this.props}
        ref={this.walletsCarousel}
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
          borderColor: BlueApp.settings.inputBorderColor,
          borderBottomColor: BlueApp.settings.inputBorderColor,
          borderWidth: 1.0,
          borderBottomWidth: 0.5,
          backgroundColor: BlueApp.settings.inputBackgroundColor,
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
          onSubmitEditing={() => Keyboard.dismiss()}
          {...this.props}
        />
        <TouchableOpacity
          disabled={this.props.isLoading}
          onPress={() => {
            NavigationService.navigate('ScanQrAddress', { onBarScanned: this.props.onBarScanned });
            Keyboard.dismiss();
          }}
          style={{
            height: 36,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#9AA0AA',
            borderRadius: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginHorizontal: 4,
          }}
        >
          <Icon name="qrcode" size={22} type="font-awesome" color={BlueApp.settings.inverseForegroundColor} />
          <Text style={{ marginLeft: 4, color: BlueApp.settings.inverseForegroundColor }}>{loc.send.details.scan}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export class BlueReplaceFeeSuggestions extends Component {
  static propTypes = {
    onFeeSelected: PropTypes.func.isRequired,
    transactionMinimum: PropTypes.number.isRequired,
  };

  static defaultProps = {
    onFeeSelected: undefined,
    transactionMinimum: 1,
  };

  state = { networkFees: undefined, selectedFeeType: NetworkTransactionFeeType.FAST, customFeeValue: 0 };

  async componentDidMount() {
    const networkFees = await NetworkTransactionFees.recommendedFees();
    this.setState({ networkFees }, () => this.onFeeSelected(NetworkTransactionFeeType.FAST));
  }

  onFeeSelected = selectedFeeType => {
    if (selectedFeeType !== NetworkTransactionFeeType.CUSTOM) {
      Keyboard.dismiss();
    }
    if (selectedFeeType === NetworkTransactionFeeType.FAST) {
      this.props.onFeeSelected(this.state.networkFees.fastestFee);
      this.setState({ selectedFeeType }, () => this.props.onFeeSelected(this.state.networkFees.fastestFee));
    } else if (selectedFeeType === NetworkTransactionFeeType.MEDIUM) {
      this.setState({ selectedFeeType }, () => this.props.onFeeSelected(this.state.networkFees.halfHourFee));
    } else if (selectedFeeType === NetworkTransactionFeeType.SLOW) {
      this.setState({ selectedFeeType }, () => this.props.onFeeSelected(this.state.networkFees.hourFee));
    } else if (selectedFeeType === NetworkTransactionFeeType.CUSTOM) {
      this.props.onFeeSelected(this.state.customFeeValue);
    }
  };

  onCustomFeeTextChange = customFee => {
    this.setState({ customFeeValue: Number(customFee), selectedFeeType: NetworkTransactionFeeType.CUSTOM }, () => {
      this.onFeeSelected(NetworkTransactionFeeType.CUSTOM);
    });
  };

  render() {
    return (
      <View>
        {this.state.networkFees && (
          <>
            <BlueText>Suggestions</BlueText>
            <TouchableOpacity onPress={() => this.onFeeSelected(NetworkTransactionFeeType.FAST)}>
              <BlueListItem
                title={'Fast'}
                rightTitle={`${this.state.networkFees.fastestFee} sat/b`}
                {...(this.state.selectedFeeType === NetworkTransactionFeeType.FAST
                  ? { rightIcon: <Icon name="check" type="font-awesome" color="#0c2550" /> }
                  : { hideChevron: true })}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => this.onFeeSelected(NetworkTransactionFeeType.MEDIUM)}>
              <BlueListItem
                title={'Medium'}
                rightTitle={`${this.state.networkFees.halfHourFee} sat/b`}
                {...(this.state.selectedFeeType === NetworkTransactionFeeType.MEDIUM
                  ? { rightIcon: <Icon name="check" type="font-awesome" color="#0c2550" /> }
                  : { hideChevron: true })}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => this.onFeeSelected(NetworkTransactionFeeType.SLOW)}>
              <BlueListItem
                title={'Slow'}
                rightTitle={`${this.state.networkFees.hourFee} sat/b`}
                {...(this.state.selectedFeeType === NetworkTransactionFeeType.SLOW
                  ? { rightIcon: <Icon name="check" type="font-awesome" color="#0c2550" /> }
                  : { hideChevron: true })}
              />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => this.customTextInput.focus()}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 18, marginRight: 18, alignItems: 'center' }}>
            <Text style={{ color: BlueApp.settings.foregroundColor, fontSize: 16, fontWeight: '500' }}>Custom</Text>
            <View
              style={{
                flexDirection: 'row',
                minHeight: 44,
                height: 44,
                minWidth: 48,
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginVertical: 8,
              }}
            >
              <TextInput
                onChangeText={this.onCustomFeeTextChange}
                keyboardType={'numeric'}
                value={this.state.customFeeValue}
                ref={ref => (this.customTextInput = ref)}
                maxLength={9}
                style={{
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  borderRadius: 4,
                  minHeight: 33,
                  maxWidth: 100,
                  minWidth: 44,
                  backgroundColor: '#f5f5f5',
                  textAlign: 'right',
                }}
                onFocus={() => this.onCustomFeeTextChange(this.state.customFeeValue)}
                defaultValue={`${this.props.transactionMinimum}`}
                placeholder="Custom sat/b"
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <Text style={{ color: BlueApp.settings.alternativeTextColor, marginHorizontal: 8 }}>sat/b</Text>
              {this.state.selectedFeeType === NetworkTransactionFeeType.CUSTOM && <Icon name="check" type="font-awesome" color="#0c2550" />}
            </View>
            <BlueDismissKeyboardInputAccessory />
          </View>
        </TouchableOpacity>
        <BlueText>
          The total fee rate (satoshi per byte) you want to pay should be higher than {this.props.transactionMinimum} sat/byte
        </BlueText>
      </View>
    );
  }
}

export class BlueBitcoinAmount extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onChangeText: PropTypes.func,
    disabled: PropTypes.bool,
    unit: PropTypes.string,
  };

  static defaultProps = {
    unit: BitcoinUnit.BTC,
  };

  render() {
    const amount = this.props.amount || 0;
    let localCurrency = loc.formatBalanceWithoutSuffix(amount, BitcoinUnit.LOCAL_CURRENCY, false);
    if (this.props.unit === BitcoinUnit.BTC) {
      let sat = new BigNumber(amount);
      sat = sat.multipliedBy(100000000).toString();
      localCurrency = loc.formatBalanceWithoutSuffix(sat, BitcoinUnit.LOCAL_CURRENCY, false);
    } else {
      localCurrency = loc.formatBalanceWithoutSuffix(amount.toString(), BitcoinUnit.LOCAL_CURRENCY, false);
    }
    if (amount === BitcoinUnit.MAX) localCurrency = ''; // we dont want to display NaN
    return (
      <TouchableWithoutFeedback disabled={this.props.pointerEvents === 'none'} onPress={() => this.textInput.focus()}>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 2 }}>
            <TextInput
              {...this.props}
              keyboardType="numeric"
              onChangeText={text => {
                text = text.trim();
                text = text.replace(',', '.');
                const split = text.split('.');
                if (split.length >= 2) {
                  text = `${parseInt(split[0], 10)}.${split[1]}`;
                } else {
                  text = `${parseInt(split[0], 10)}`;
                }
                text = this.props.unit === BitcoinUnit.BTC ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');
                text = text.replace(/(\..*)\./g, '$1');

                if (text.startsWith('.')) {
                  text = '0.';
                }
                text = text.replace(/(0{1,}.)\./g, '$1');
                if (this.props.unit !== BitcoinUnit.BTC) {
                  text = text.replace(/[^0-9.]/g, '');
                }
                this.props.onChangeText(text);
              }}
              onBlur={() => {
                if (this.props.onBlur) this.props.onBlur();
              }}
              onFocus={() => {
                if (this.props.onFocus) this.props.onFocus();
              }}
              placeholder="0"
              maxLength={10}
              ref={textInput => (this.textInput = textInput)}
              editable={!this.props.isLoading && !this.props.disabled}
              value={amount}
              placeholderTextColor={this.props.disabled ? BlueApp.settings.buttonDisabledTextColor : BlueApp.settings.alternativeTextColor2}
              style={{
                color: this.props.disabled ? BlueApp.settings.buttonDisabledTextColor : BlueApp.settings.alternativeTextColor2,
                fontSize: 36,
                fontWeight: '600',
              }}
            />
            <Text
              style={{
                color: this.props.disabled ? BlueApp.settings.buttonDisabledTextColor : BlueApp.settings.alternativeTextColor2,
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
            <Text style={{ fontSize: 18, color: '#d4d4d4', fontWeight: '600' }}>{localCurrency}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  balanceBlur: {
    height: 30,
    width: 100,
    marginRight: 16,
  },
});
