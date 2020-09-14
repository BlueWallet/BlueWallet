/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
/* global alert */
import React, { Component, useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { Icon, Input, Text, Header, ListItem } from 'react-native-elements';
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
  Platform,
  FlatList,
  TextInput,
  PixelRatio,
} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import ActionSheet from './screen/ActionSheet';
import { LightningCustodianWallet, PlaceholderWallet } from './class';
import Carousel from 'react-native-snap-carousel';
import { BitcoinUnit } from './models/bitcoinUnits';
import * as NavigationService from './NavigationService';
import WalletGradient from './class/wallet-gradient';
import ToolTip from 'react-native-tooltip';
import { BlurView } from '@react-native-community/blur';
import ImagePicker from 'react-native-image-picker';
import showPopupMenu from 'react-native-popup-menu-android';
import NetworkTransactionFees, { NetworkTransactionFeeType } from './models/networkTransactionFees';
import Biometric from './class/biometrics';
import { getSystemName } from 'react-native-device-info';
import { encodeUR } from 'bc-ur/dist';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@react-navigation/native';
import { BlueCurrentTheme } from './components/themes';
import loc, { formatBalance, formatBalanceWithoutSuffix, formatBalancePlain, removeTrailingZeros, transactionTimeToReadable } from './loc';
import AsyncStorage from '@react-native-community/async-storage';
import Lnurl from './class/lnurl';
import ScanQRCode from './screen/send/ScanQRCode';
/** @type {AppStorage} */
const BlueApp = require('./BlueApp');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
const BigNumber = require('bignumber.js');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const currency = require('./blue_modules/currency');
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export class BlueButton extends Component {
  render() {
    let backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : BlueCurrentTheme.colors.mainColor;
    let fontColor = BlueCurrentTheme.colors.buttonTextColor;
    if (this.props.disabled === true) {
      backgroundColor = BlueCurrentTheme.colors.buttonDisabledBackgroundColor;
      fontColor = BlueCurrentTheme.colors.buttonDisabledTextColor;
    }
    let buttonWidth = this.props.width ? this.props.width : width / 1.5;
    if ('noMinWidth' in this.props) {
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

export const BlueButtonHook = props => {
  const { colors } = useTheme();
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.mainColor;
  let fontColor = colors.buttonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }
  let buttonWidth = props.width ? props.width : width / 1.5;
  if ('noMinWidth' in props) {
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
      {...props}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
        {props.title && <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{props.title}</Text>}
      </View>
    </TouchableOpacity>
  );
};

export class SecondButton extends Component {
  render() {
    let backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : BlueCurrentTheme.colors.buttonBlueBackgroundColor;
    let fontColor = BlueCurrentTheme.colors.buttonTextColor;
    if (this.props.disabled === true) {
      backgroundColor = BlueCurrentTheme.colors.buttonDisabledBackgroundColor;
      fontColor = BlueCurrentTheme.colors.buttonDisabledTextColor;
    }
    let buttonWidth = this.props.width ? this.props.width : width / 1.5;
    if ('noMinWidth' in this.props) {
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

export const BitcoinButton = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity testID={props.testID} onPress={props.onPress}>
      <View
        style={{
          borderColor: colors.hdborderColor,
          borderWidth: 1,
          borderRadius: 5,
          backgroundColor: (props.active && colors.hdbackgroundColor) || colors.brandingColor,
          minWidth: props.style.width,
          minHeight: props.style.height,
          height: props.style.height,
          flex: 1,
        }}
      >
        <View style={{ marginTop: 16, marginLeft: 16, marginBottom: 16 }}>
          <Text style={{ color: colors.hdborderColor, fontWeight: 'bold' }}>{loc.wallets.add_bitcoin}</Text>
        </View>
        <Image
          style={{ width: 34, height: 34, marginRight: 8, marginBottom: 8, justifyContent: 'flex-end', alignSelf: 'flex-end' }}
          source={require('./img/addWallet/bitcoin.png')}
        />
      </View>
    </TouchableOpacity>
  );
};

export const LightningButton = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={props.onPress}>
      <View
        style={{
          borderColor: colors.lnborderColor,
          borderWidth: 1,
          borderRadius: 5,
          backgroundColor: (props.active && colors.lnbackgroundColor) || colors.brandingColor,
          minWidth: props.style.width,
          minHeight: props.style.height,
          height: props.style.height,
          flex: 1,
        }}
      >
        <View style={{ marginTop: 16, marginLeft: 16, marginBottom: 16 }}>
          <Text style={{ color: colors.lnborderColor, fontWeight: 'bold' }}>{loc.wallets.add_lightning}</Text>
        </View>
        <Image
          style={{ width: 34, height: 34, marginRight: 8, marginBottom: 8, justifyContent: 'flex-end', alignSelf: 'flex-end' }}
          source={require('./img/addWallet/lightning.png')}
        />
      </View>
    </TouchableOpacity>
  );
};

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
    Clipboard.setString(formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit()).toString());
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
    if (item === loc.transactions.details_copy || item.id === loc.transactions.details.copy) {
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
      //   { text: loc.transactions.details_copy, onPress: this.handleCopyPress },
      // ],
      android: this.state.wallet.hideBalance
        ? [{ id: 'balancePrivacy', label: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance' }]
        : [
            { id: 'balancePrivacy', label: this.state.wallet.hideBalance ? 'Show Balance' : 'Hide Balance' },
            { id: loc.transactions.details_copy, label: loc.transactions.details.copy },
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
                    { text: loc.transactions.details_copy, onPress: this.handleCopyPress },
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
              testID="WalletBalance"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: 36,
                color: '#fff',
              }}
            >
              {formatBalance(this.state.wallet.getBalance(), this.state.wallet.getPreferredBalanceUnit(), true).toString()}
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

export const BlueButtonLinkHook = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={{
        minHeight: 60,
        minWidth: 100,
        height: 60,
        justifyContent: 'center',
      }}
      onPress={props.onPress}
      {...props}
    >
      <Text style={{ color: colors.foregroundColor, textAlign: 'center', fontSize: 16 }}>{props.title}</Text>
    </TouchableOpacity>
  );
};

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
        <Text style={{ color: BlueCurrentTheme.colors.foregroundColor, textAlign: 'center', fontSize: 16 }}>{this.props.title}</Text>
      </TouchableOpacity>
    );
  }
}

export const BlueAlertWalletExportReminder = ({ onSuccess = () => {}, onFailure }) => {
  Alert.alert(
    loc.wallets.details_title,
    loc.pleasebackup.ask,
    [
      { text: loc.pleasebackup.ask_yes, onPress: onSuccess, style: 'cancel' },
      { text: loc.pleasebackup.ask_no, onPress: onFailure },
    ],
    { cancelable: false },
  );
};

export const BlueNavigationStyle = (navigation, withNavigationCloseButton = false, customCloseButtonFunction = undefined) => {
  let headerRight;
  const { colors, closeImage } = useTheme();
  if (withNavigationCloseButton) {
    headerRight = () => (
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
        <Image style={{ alignSelf: 'center' }} source={closeImage} />
      </TouchableOpacity>
    );
  } else {
    headerRight = null;
  }

  return {
    headerStyle: {
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerTitleStyle: {
      fontWeight: '600',
      color: colors.foregroundColor,
    },
    headerRight,
    headerBackTitleVisible: false,
    headerTintColor: colors.foregroundColor,
  };
};

export const BlueCreateTxNavigationStyle = (navigation, withAdvancedOptionsMenuButton = false, advancedOptionsMenuButtonAction) => {
  let headerRight;
  if (withAdvancedOptionsMenuButton) {
    headerRight = () => (
      <TouchableOpacity style={{ minWidth: 40, height: 40, justifyContent: 'center' }} onPress={advancedOptionsMenuButtonAction}>
        <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueCurrentTheme.colors.foregroundColor} />
      </TouchableOpacity>
    );
  } else {
    headerRight = null;
  }
  return {
    headerStyle: {
      borderBottomWidth: 0,
      elevation: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerTitleStyle: {
      fontWeight: '600',
      color: BlueCurrentTheme.colors.foregroundColor,
    },
    headerTintColor: BlueCurrentTheme.colors.foregroundColor,
    headerLeft: () => (
      <TouchableOpacity
        style={{ minWwidth: 40, height: 40, justifyContent: 'center', paddingHorizontal: 14 }}
        onPress={() => {
          Keyboard.dismiss();
          navigation.goBack(null);
        }}
      >
        <Image style={{}} source={BlueCurrentTheme.closeImage} />
      </TouchableOpacity>
    ),
    headerRight,
    headerBackTitle: null,
  };
};

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
    <TouchableOpacity onPress={() => Clipboard.setString(stringToCopy)}>
      <Text style={{ fontSize: 13, fontWeight: '400', color: '#68bbe1' }}>{displayText || loc.transactions.details_copy}</Text>
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
      this.setState({ address: loc.wallets.xpub_copiedToClipboard }, () => {
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
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, backgroundColor: BlueCurrentTheme.colors.background }}
        {...this.props}
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
          color: BlueCurrentTheme.colors.foregroundColor,
          ...this.props.style,
        }}
        {...this.props}
      />
    );
  }
}

export const BlueTextHooks = props => {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.foregroundColor,
        ...props.style,
      }}
      {...props}
    />
  );
};
export class BlueTextCentered extends Component {
  render() {
    return <Text {...this.props} style={{ color: BlueCurrentTheme.colors.foregroundColor, textAlign: 'center' }} />;
  }
}

export const BlueTextCenteredHooks = props => {
  const { colors } = useTheme();
  return <Text {...props} style={{ color: colors.foregroundColor, textAlign: 'center' }} />;
};

export const BlueListItem = React.memo(props => (
  <ListItem
    testID={props.testID}
    bottomDivider
    containerStyle={{
      backgroundColor: 'transparent',
      borderBottomColor: BlueCurrentTheme.colors.lightBorder,
      paddingTop: 16,
      paddingBottom: 16,
    }}
    titleStyle={{
      color: props.disabled ? BlueCurrentTheme.colors.buttonDisabledTextColor : BlueCurrentTheme.colors.foregroundColor,
      fontSize: 16,
      fontWeight: '500',
    }}
    subtitleStyle={{ flexWrap: 'wrap', color: BlueCurrentTheme.colors.alternativeTextColor, fontWeight: '400', fontSize: 14 }}
    subtitleNumberOfLines={1}
    titleNumberOfLines={0}
    Component={TouchableOpacity}
    {...props}
  />
));

export const BlueListItemHooks = props => {
  const { colors } = useTheme();
  return (
    <ListItem
      testID={props.testID}
      bottomDivider
      containerStyle={{
        backgroundColor: 'transparent',
        borderBottomColor: colors.lightBorder,
        paddingTop: 16,
        paddingBottom: 16,
      }}
      titleStyle={{
        color: props.disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
        fontSize: 16,
        fontWeight: '500',
      }}
      rightTitleStyle={{ flexWrap: 'wrap', color: colors.alternativeTextColor, fontWeight: '400', fontSize: 14 }}
      subtitleStyle={{ flexWrap: 'wrap', color: colors.alternativeTextColor, fontWeight: '400', fontSize: 14 }}
      subtitleNumberOfLines={1}
      titleNumberOfLines={0}
      Component={TouchableOpacity}
      {...props}
    />
  );
};

export const BlueFormLabel = props => {
  const { colors } = useTheme();

  return <Text {...props} style={{ color: colors.foregroundColor, fontWeight: '400', marginLeft: 20 }} />;
};

export class BlueFormInput extends Component {
  render() {
    return (
      <Input
        {...this.props}
        inputStyle={{ color: BlueCurrentTheme.colors.foregroundColor, maxWidth: width - 105 }}
        containerStyle={{
          marginTop: 5,
          borderColor: BlueCurrentTheme.colors.inputBorderColor,
          borderBottomColor: BlueCurrentTheme.colors.inputBorderColor,
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
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
          paddingHorizontal: 8,
          paddingVertical: 16,
          flex: 1,
          marginTop: 5,
          marginHorizontal: 20,
          borderColor: BlueCurrentTheme.colors.formBorder,
          borderBottomColor: BlueCurrentTheme.colors.formBorder,
          borderWidth: 1,
          borderBottomWidth: 0.5,
          borderRadius: 4,
          backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
          color: BlueCurrentTheme.colors.foregroundColor,
          textAlignVertical: 'top',
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
      />
    );
  }
}

export class BlueHeaderDefaultSub extends Component {
  render() {
    return (
      <SafeAreaView style={{ backgroundColor: BlueCurrentTheme.colors.brandingColor }}>
        <Header
          backgroundColor={BlueCurrentTheme.colors.background}
          leftContainerStyle={{ minWidth: '100%' }}
          outerContainerStyles={{
            borderBottomColor: 'transparent',
            borderBottomWidth: 0,
          }}
          leftComponent={
            <Text
              adjustsFontSizeToFit
              style={{
                fontWeight: 'bold',
                fontSize: 30,
                color: BlueCurrentTheme.colors.foregroundColor,
              }}
            >
              {this.props.leftText}
            </Text>
          }
          rightComponent={
            <TouchableOpacity
              onPress={() => {
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

export const BlueHeaderDefaultSubHooks = props => {
  const { colors } = useTheme();

  return (
    <SafeAreaView>
      <Header
        backgroundColor={colors.background}
        leftContainerStyle={{ minWidth: '100%' }}
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        leftComponent={
          <Text
            adjustsFontSizeToFit
            style={{
              fontWeight: 'bold',
              fontSize: 30,
              color: colors.foregroundColor,
            }}
          >
            {props.leftText}
          </Text>
        }
        {...props}
      />
    </SafeAreaView>
  );
};

export const BlueHeaderDefaultMainHooks = props => {
  const { colors } = useTheme();
  return (
    <Header
      {...props}
      leftComponent={{
        text: props.leftText,
        style: {
          fontWeight: 'bold',
          fontSize: 34,
          color: colors.foregroundColor,
        },
      }}
      leftContainerStyle={{
        minWidth: '70%',
        height: 80,
      }}
      bottomDivider={false}
      topDivider={false}
      containerStyle={{
        height: 44,
        flexDirection: 'row',
        backgroundColor: colors.elevatated,
        borderTopColor: colors.elevatated,
        borderBottomColor: colors.elevatated,
        borderBottomWidth: 0,
      }}
      rightComponent={
        props.onNewWalletPress && (
          <TouchableOpacity
            onPress={props.onNewWalletPress}
            style={{
              height: 100,
            }}
          >
            <BluePlusIcon />
          </TouchableOpacity>
        )
      }
    />
  );
};

export class BlueHeaderDefaultMain extends Component {
  render() {
    return (
      <SafeAreaView style={{ paddingVertical: 8, paddingHorizontal: 4, backgroundColor: BlueCurrentTheme.colors.background }}>
        <Header
          {...this.props}
          leftComponent={{
            text: this.props.leftText,
            style: {
              fontWeight: 'bold',
              fontSize: 34,
              color: BlueCurrentTheme.colors.foregroundColor,
            },
          }}
          leftContainerStyle={{
            minWidth: '70%',
            height: 80,
          }}
          bottomDivider={false}
          topDivider={false}
          containerStyle={{
            height: 44,
            flexDirection: 'row',
            backgroundColor: BlueCurrentTheme.colors.background,
            borderTopColor: BlueCurrentTheme.colors.background,
            borderBottomColor: BlueCurrentTheme.colors.background,
            borderBottomWidth: 0,
          }}
          rightComponent={
            this.props.onNewWalletPress && (
              <TouchableOpacity
                onPress={this.props.onNewWalletPress}
                style={{
                  height: 100,
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
    return <View {...this.props} style={{ height: 60 }} />;
  }
}

export class BlueSpacing40 extends Component {
  render() {
    return <View {...this.props} style={{ height: 50 }} />;
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
    return <FlatList {...this.props} />;
  }
}

export class BlueUseAllFundsButton extends Component {
  static InputAccessoryViewID = 'useMaxInputAccessoryViewID';
  static propTypes = {
    wallet: PropTypes.shape().isRequired,
    onUseAllPressed: PropTypes.func.isRequired,
  };

  static defaultProps = {
    unit: BitcoinUnit.BTC,
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
          backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <Text
            style={{
              color: BlueCurrentTheme.colors.alternativeTextColor,
              fontSize: 16,
              marginLeft: 8,
              marginRight: 0,
              paddingRight: 0,
              paddingLeft: 0,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            {loc.send.input_total}
          </Text>
          {this.props.wallet.allowSendMax() && this.props.wallet.getBalance() > 0 ? (
            <BlueButtonLink
              onPress={this.props.onUseAllPressed}
              style={{ marginLeft: 8, paddingRight: 0, paddingLeft: 0, paddingTop: 12, paddingBottom: 12 }}
              title={`${formatBalanceWithoutSuffix(this.props.wallet.getBalance(), BitcoinUnit.BTC, true).toString()} ${BitcoinUnit.BTC}`}
            />
          ) : (
            <Text
              style={{
                color: BlueCurrentTheme.colors.alternativeTextColor,
                fontSize: 16,
                marginLeft: 8,
                marginRight: 0,
                paddingRight: 0,
                paddingLeft: 0,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              {formatBalanceWithoutSuffix(this.props.wallet.getBalance(), BitcoinUnit.BTC, true).toString()} {BitcoinUnit.BTC}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <BlueButtonLink
            style={{ paddingRight: 8, paddingLeft: 0, paddingTop: 12, paddingBottom: 12 }}
            title={loc.send.input_done}
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
            backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
            height: 44,
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <BlueButtonLink title={loc.send.input_done} onPress={() => Keyboard.dismiss()} />
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
          backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          maxHeight: 44,
        }}
      >
        <BlueButtonLink title={loc.send.input_clear} onPress={this.props.onClearTapped} />
        <BlueButtonLink title={loc.send.input_paste} onPress={this.onPasteTapped} />
        <BlueButtonLink title={loc.send.input_done} onPress={() => Keyboard.dismiss()} />
      </View>
    );

    if (Platform.OS === 'ios') {
      return <InputAccessoryView nativeID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}>{inputView}</InputAccessoryView>;
    } else {
      return <KeyboardAvoidingView>{inputView}</KeyboardAvoidingView>;
    }
  }
}

export class BlueLoading extends Component {
  render() {
    return (
      <View style={{ flex: 1, paddingTop: 200 }} {...this.props}>
        <ActivityIndicator />
      </View>
    );
  }
}

export const BlueLoadingHook = () => {
  return (
    <View style={{ flex: 1, paddingTop: 200 }}>
      <ActivityIndicator />
    </View>
  );
};

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
  },
  ballIncoming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
  },
  ballIncomingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  ballReceive: {
    width: 30,
    height: 30,
    borderBottomLeftRadius: 15,
    transform: [{ rotate: '-45deg' }],
  },
  ballOutgoing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    transform: [{ rotate: '225deg' }],
    justifyContent: 'center',
  },
  ballOutgoingWithoutRotate: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  ballOutgoingExpired: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
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

export const BluePlusIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });
  return (
    <View {...props} style={stylesBlueIcon.container}>
      <View style={stylesBlueIcon.box1}>
        <View style={[stylesBlueIcon.ball, stylesBlueIconHooks.ball]}>
          <Ionicons
            {...props}
            name="ios-add"
            size={26}
            style={{
              color: colors.foregroundColor,
              backgroundColor: 'transparent',
              left: 8,
              top: 1,
            }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionIncomingIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballIncoming: {
      backgroundColor: colors.ballReceive,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballIncoming, stylesBlueIconHooks.ballIncoming]}>
          <Icon {...props} name="arrow-down" size={16} type="font-awesome" color={colors.incomingForegroundColor} />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionPendingIcon = props => {
  const { colors } = useTheme();

  const stylesBlueIconHooks = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ball, stylesBlueIconHooks.ball]}>
          <Icon
            {...props}
            name="kebab-horizontal"
            size={16}
            type="octicon"
            color={colors.foregroundColor}
            iconStyle={{ left: 0, top: 7 }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionExpiredIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballOutgoingExpired: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballOutgoingExpired, stylesBlueIconHooks.ballOutgoingExpired]}>
          <Icon {...props} name="clock" size={16} type="octicon" color="#9AA0AA" iconStyle={{ left: 0, top: 0 }} />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionOnchainIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballIncoming: {
      backgroundColor: colors.ballReceive,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballIncoming, stylesBlueIconHooks.ballIncoming]}>
          <Icon
            {...props}
            name="link"
            size={16}
            type="font-awesome"
            color={colors.incomingForegroundColor}
            iconStyle={{ left: 0, top: 0, transform: [{ rotate: '-45deg' }] }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionOffchainIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballOutgoingWithoutRotate: {
      backgroundColor: colors.ballOutgoing,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballOutgoingWithoutRotate, stylesBlueIconHooks.ballOutgoingWithoutRotate]}>
          <Icon
            {...props}
            name="bolt"
            size={16}
            type="font-awesome"
            color={colors.outgoingForegroundColor}
            iconStyle={{ left: 0, marginTop: 6 }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionOffchainIncomingIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballIncomingWithoutRotate: {
      backgroundColor: colors.ballReceive,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballIncomingWithoutRotate, stylesBlueIconHooks.ballIncomingWithoutRotate]}>
          <Icon
            {...props}
            name="bolt"
            size={16}
            type="font-awesome"
            color={colors.incomingForegroundColor}
            iconStyle={{ left: 0, marginTop: 6 }}
          />
        </View>
      </View>
    </View>
  );
};

export const BlueTransactionOutgoingIcon = props => {
  const { colors } = useTheme();
  const stylesBlueIconHooks = StyleSheet.create({
    ballOutgoing: {
      backgroundColor: colors.ballOutgoing,
    },
  });
  return (
    <View {...props}>
      <View style={stylesBlueIcon.boxIncoming}>
        <View style={[stylesBlueIcon.ballOutgoing, stylesBlueIconHooks.ballOutgoing]}>
          <Icon {...props} name="arrow-down" size={16} type="font-awesome" color={colors.outgoingForegroundColor} />
        </View>
      </View>
    </View>
  );
};

const sendReceiveScanButtonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);
export const BlueReceiveButtonIcon = props => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity {...props} style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.buttonBackgroundColor,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              left: 5,
              backgroundColor: 'transparent',
              transform: [{ rotate: '-45deg' }],
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Icon
              {...props}
              name="arrow-down"
              size={sendReceiveScanButtonFontSize}
              type="font-awesome"
              color={colors.buttonAlternativeTextColor}
            />
          </View>
          <Text
            style={{
              color: colors.buttonAlternativeTextColor,
              fontWeight: '500',
              fontSize: sendReceiveScanButtonFontSize,
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
};

export class BlueScanButton extends Component {
  render() {
    return (
      <TouchableOpacity {...this.props} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: BlueCurrentTheme.colors.buttonBackgroundColor,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                minWidth: 24,
                minHeight: 30,
                backgroundColor: 'transparent',
                alignItems: 'center',
                marginBottom: -15,
                marginLeft: -8,
              }}
            >
              <Image resizeMode="stretch" source={BlueCurrentTheme.scanImage} />
            </View>
            <Text
              style={{
                color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
                fontSize: sendReceiveScanButtonFontSize,
                fontWeight: '600',
                left: 5,
                backgroundColor: 'transparent',
              }}
            >
              {loc.send.details_scan}
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
      <TouchableOpacity {...this.props} testID="SendButton" style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: BlueCurrentTheme.colors.buttonBackgroundColor,
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                left: 5,
                backgroundColor: 'transparent',
                transform: [{ rotate: '225deg' }],
                marginRight: 8,
              }}
            >
              <Icon
                {...this.props}
                name="arrow-down"
                size={sendReceiveScanButtonFontSize}
                type="font-awesome"
                color={BlueCurrentTheme.colors.buttonAlternativeTextColor}
              />
            </View>
            <Text
              style={{
                color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
                fontSize: sendReceiveScanButtonFontSize,
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
            backgroundColor: BlueCurrentTheme.colors.buttonBackgroundColor,
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
              <Icon {...this.props} name="link" size={16} type="font-awesome" color={BlueCurrentTheme.colors.buttonAlternativeTextColor} />
            </View>
            <Text
              style={{
                color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
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
          backgroundColor: WalletGradient.createWallet,
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

export const BlueTransactionListItem = React.memo(({ item, itemPriceUnit = BitcoinUnit.BTC, timeElapsed }) => {
  const [subtitleNumberOfLines, setSubtitleNumberOfLines] = useState(1);
  const { colors } = useTheme();

  const txMemo = () => {
    if (BlueApp.tx_metadata[item.hash] && BlueApp.tx_metadata[item.hash].memo) {
      return BlueApp.tx_metadata[item.hash].memo;
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
        return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
    }
  };

  const rowTitleStyle = () => {
    let color = colors.successColor;

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = colors.successColor;
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = colors.successColor;
        } else {
          color = '#9AA0AA';
        }
      }
    } else if (item.value / 100000000 < 0) {
      color = colors.foregroundColor;
    }

    return {
      fontWeight: '600',
      fontSize: 14,
      color: color,
      textAlign: 'right',
      width: 96,
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
    return (item.confirmations < 7 ? loc.transactions.list_conf + ': ' + item.confirmations + ' ' : '') + txMemo() + (item.memo || '');
  };

  const onPress = async () => {
    if (item.hash) {
      NavigationService.navigate('TransactionStatus', { hash: item.hash });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') {
      const lightningWallet = BlueApp.getWallets().filter(wallet => {
        if (typeof wallet === 'object') {
          if ('secret' in wallet) {
            return wallet.getSecret() === item.fromWallet;
          }
        }
      });
      if (lightningWallet.length === 1) {
        // is it a successful lnurl-pay?
        const LN = new Lnurl(false, AsyncStorage);
        let paymentHash = item.payment_hash;
        if (typeof paymentHash === 'object') {
          paymentHash = Buffer.from(paymentHash.data).toString('hex');
        }
        const loaded = await LN.loadSuccessfulPayment(paymentHash);
        if (loaded) {
          NavigationService.navigate('ScanLndInvoiceRoot', {
            screen: 'LnurlPaySuccess',
            params: {
              paymentHash: paymentHash,
              justPaid: false,
              fromWalletID: lightningWallet[0].getID(),
            },
          });
          return;
        }

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
    <View style={{ marginHorizontal: 4 }}>
      <BlueListItem
        leftAvatar={avatar()}
        title={transactionTimeToReadable(item.received)}
        titleNumberOfLines={subtitleNumberOfLines}
        subtitle={subtitle()}
        subtitleProps={{ numberOfLines: subtitleNumberOfLines }}
        onPress={onPress}
        onLongPress={onLongPress}
        chevron={false}
        Component={TouchableOpacity}
        rightTitle={rowTitle()}
        rightTitleStyle={rowTitleStyle()}
      />
    </View>
  );
});

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

  if (!item) {
    return (
      <NewWalletPanel
        onPress={() => {
          onPressedOut();
          onPress(index);
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

const sliderWidth = width * 1;
const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
const sliderHeight = 190;

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
    this.walletsCarousel.current.snapToItem(item);
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
const isDesktop = getSystemName() === 'Mac OS X';
export class BlueAddressInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    onChangeText: PropTypes.func,
    onBarScanned: PropTypes.func.isRequired,
    launchedBy: PropTypes.string.isRequired,
    address: PropTypes.string,
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    isLoading: false,
    address: '',
    placeholder: loc.send.details_address,
  };

  choosePhoto = () => {
    ImagePicker.launchImageLibrary(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              this.props.onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  takePhoto = () => {
    ImagePicker.launchCamera(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              this.props.onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        } else if (response.error) {
          ScanQRCode.presentCameraNotAuthorizedAlert(response.error);
        }
      },
    );
  };

  copyFromClipbard = async () => {
    this.props.onBarScanned(await Clipboard.getString());
  };

  showActionSheet = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).trim().length === 0;
    let copyFromClipboardIndex;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, isDesktop ? loc.wallets.take_photo : loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
        copyFromClipboardIndex = options.length - 1;
      }

      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          this.choosePhoto();
        } else if (buttonIndex === 2) {
          this.takePhoto();
        } else if (buttonIndex === copyFromClipboardIndex) {
          this.copyFromClipbard();
        }
      });
    }
  };

  render() {
    return (
      <View
        style={{
          flexDirection: 'row',
          borderColor: BlueCurrentTheme.colors.formBorder,
          borderBottomColor: BlueCurrentTheme.colors.formBorder,
          borderWidth: 1.0,
          borderBottomWidth: 0.5,
          backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
          minHeight: 44,
          height: 44,
          marginHorizontal: 20,
          alignItems: 'center',
          marginVertical: 8,
          borderRadius: 4,
        }}
      >
        <TextInput
          testID="AddressInput"
          onChangeText={text => {
            this.props.onChangeText(text);
          }}
          placeholder={this.props.placeholder}
          numberOfLines={1}
          placeholderTextColor="#81868e"
          value={this.props.address}
          style={{ flex: 1, marginHorizontal: 8, minHeight: 33, color: '#81868e' }}
          editable={!this.props.isLoading}
          onSubmitEditing={Keyboard.dismiss}
          {...this.props}
        />
        <TouchableOpacity
          disabled={this.props.isLoading}
          onPress={() => {
            Keyboard.dismiss();
            if (isDesktop) {
              this.showActionSheet();
            } else {
              NavigationService.navigate('ScanQRCodeRoot', {
                screen: 'ScanQRCode',
                params: {
                  launchedBy: this.props.launchedBy,
                  onBarScanned: this.props.onBarScanned,
                },
              });
            }
          }}
          style={{
            height: 36,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: BlueCurrentTheme.colors.scanLabel,
            borderRadius: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginHorizontal: 4,
          }}
        >
          <Image style={{}} source={require('./img/scan-white.png')} />
          <Text style={{ marginLeft: 4, color: BlueCurrentTheme.colors.inverseForegroundColor }}>{loc.send.details_scan}</Text>
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
      this.setState({ selectedFeeType }, () => this.props.onFeeSelected(this.state.networkFees.mediumFee));
    } else if (selectedFeeType === NetworkTransactionFeeType.SLOW) {
      this.setState({ selectedFeeType }, () => this.props.onFeeSelected(this.state.networkFees.slowFee));
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
            <BlueListItem
              onPress={() => this.onFeeSelected(NetworkTransactionFeeType.FAST)}
              containerStyle={{ paddingHorizontal: 0, marginHorizontal: 0, backgroundColor: BlueCurrentTheme.colors.transparent }}
              bottomDivider={false}
              title="Fast"
              rightTitle={`${this.state.networkFees.fastestFee} sat/b`}
              rightTitleStyle={{ fontSize: 13, color: BlueCurrentTheme.colors.alternativeTextColor }}
              {...(this.state.selectedFeeType === NetworkTransactionFeeType.FAST
                ? { rightIcon: <Icon name="check" type="octaicon" color={BlueCurrentTheme.colors.successCheck} /> }
                : { hideChevron: true })}
            />
            <BlueListItem
              onPress={() => this.onFeeSelected(NetworkTransactionFeeType.MEDIUM)}
              containerStyle={{ paddingHorizontal: 0, marginHorizontal: 0, backgroundColor: BlueCurrentTheme.colors.transparent }}
              bottomDivider={false}
              title="Medium"
              rightTitle={`${this.state.networkFees.mediumFee} sat/b`}
              rightTitleStyle={{ fontSize: 13, color: BlueCurrentTheme.colors.alternativeTextColor }}
              {...(this.state.selectedFeeType === NetworkTransactionFeeType.MEDIUM
                ? { rightIcon: <Icon name="check" type="octaicon" color={BlueCurrentTheme.colors.successCheck} /> }
                : { hideChevron: true })}
            />
            <BlueListItem
              onPress={() => this.onFeeSelected(NetworkTransactionFeeType.SLOW)}
              containerStyle={{ paddingHorizontal: 0, marginHorizontal: 0, backgroundColor: BlueCurrentTheme.colors.transparent }}
              bottomDivider={false}
              title="Slow"
              rightTitle={`${this.state.networkFees.slowFee} sat/b`}
              rightTitleStyle={{ fontSize: 13, color: BlueCurrentTheme.colors.alternativeTextColor }}
              {...(this.state.selectedFeeType === NetworkTransactionFeeType.SLOW
                ? { rightIcon: <Icon name="check" type="octaicon" color={BlueCurrentTheme.colors.successCheck} /> }
                : { hideChevron: true })}
            />
          </>
        )}
        <TouchableOpacity onPress={() => this.customTextInput.focus()}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 0, alignItems: 'center' }}>
            <Text style={{ color: BlueCurrentTheme.colors.foregroundColor, fontSize: 16, fontWeight: '500' }}>Custom</Text>
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
                keyboardType="numeric"
                value={this.state.customFeeValue}
                ref={ref => (this.customTextInput = ref)}
                maxLength={9}
                style={{
                  borderColor: BlueCurrentTheme.colors.formBorder,
                  borderBottomColor: BlueCurrentTheme.colors.formBorder,
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  borderRadius: 4,
                  minHeight: 33,
                  maxWidth: 100,
                  minWidth: 44,
                  color: '#81868e',
                  backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
                  textAlign: 'right',
                }}
                onFocus={() => this.onCustomFeeTextChange(this.state.customFeeValue)}
                defaultValue={`${this.props.transactionMinimum}`}
                placeholder="Custom sat/b"
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <Text style={{ color: BlueCurrentTheme.colors.alternativeTextColor, marginHorizontal: 8 }}>sat/b</Text>
              {this.state.selectedFeeType === NetworkTransactionFeeType.CUSTOM && <Icon name="check" type="octaicon" color="#0070FF" />}
            </View>
            <BlueDismissKeyboardInputAccessory />
          </View>
        </TouchableOpacity>
        <BlueText style={{ color: BlueCurrentTheme.colors.alternativeTextColor }}>
          The total fee rate (satoshi per byte) you want to pay should be higher than {this.props.transactionMinimum} sat/byte
        </BlueText>
      </View>
    );
  }
}

export class BlueBitcoinAmount extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * amount is a sting thats always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
     */
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
     * (btc, sat, fiat)
     */
    onChangeText: PropTypes.func,
    /**
     * callback thats fired to notify of currently selected denomination, returns <BitcoinUnit.*>
     */
    onAmountUnitChange: PropTypes.func,
    disabled: PropTypes.bool,
  };

  /**
   * cache of conversions  fiat amount => satoshi
   * @type {{}}
   */
  static conversionCache = {};

  static getCachedSatoshis(amount) {
    return BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] || false;
  }

  static setCachedSatoshis(amount, sats) {
    BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
  }

  constructor(props) {
    super(props);
    this.state = { unit: props.unit || BitcoinUnit.BTC, previousUnit: BitcoinUnit.SATS };
  }

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || 0;
    console.log('was:', amount, previousUnit, '; converting to', newUnit);
    let sats = 0;
    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS:
        sats = amount;
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(currency.fiatToBTC(amount)).multipliedBy(100000000).toString();
        break;
    }
    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && BlueBitcoinAmount.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      sats = BlueBitcoinAmount.conversionCache[amount + previousUnit];
    }
    console.log('so, in sats its', sats);

    const newInputValue = formatBalancePlain(sats, newUnit, false);
    console.log('and in', newUnit, 'its', newInputValue);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      // we cache conversion, so when we will need reverse conversion there wont be a rounding error
      BlueBitcoinAmount.conversionCache[newInputValue + newUnit] = amount;
    }
    this.props.onChangeText(newInputValue);
    if (this.props.onAmountUnitChange) this.props.onAmountUnitChange(newUnit);
  }

  /**
   * responsible for cycling currently selected denomination, BTC->SAT->LOCAL_CURRENCY->BTC
   */
  changeAmountUnit = () => {
    let previousUnit = this.state.unit;
    let newUnit;
    if (previousUnit === BitcoinUnit.BTC) {
      newUnit = BitcoinUnit.SATS;
    } else if (previousUnit === BitcoinUnit.SATS) {
      newUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else if (previousUnit === BitcoinUnit.LOCAL_CURRENCY) {
      newUnit = BitcoinUnit.BTC;
    } else {
      newUnit = BitcoinUnit.BTC;
      previousUnit = BitcoinUnit.SATS;
    }
    this.setState({ unit: newUnit, previousUnit }, () => this.onAmountUnitChange(previousUnit, newUnit));
  };

  maxLength = () => {
    switch (this.state.unit) {
      case BitcoinUnit.BTC:
        return 10;
      case BitcoinUnit.SATS:
        return 15;
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleTextInputOnPress = () => {
    this.textInput.current.focus();
  };

  render() {
    const amount = this.props.amount || 0;
    let secondaryDisplayCurrency = formatBalanceWithoutSuffix(amount, BitcoinUnit.LOCAL_CURRENCY, false);

    // if main display is sat or btc - secondary display is fiat
    // if main display is fiat - secondary dislay is btc
    let sat;
    switch (this.state.unit) {
      case BitcoinUnit.BTC:
        sat = new BigNumber(amount).multipliedBy(100000000).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(sat, BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.SATS:
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(amount.toString(), BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        secondaryDisplayCurrency = currency.fiatToBTC(parseFloat(amount));
        if (BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          const sats = BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
          secondaryDisplayCurrency = currency.satoshiToBTC(sats);
        }
        break;
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = ''; // we dont want to display NaN
    return (
      <TouchableWithoutFeedback disabled={this.props.pointerEvents === 'none'} onPress={() => this.textInput.focus()}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {!this.props.disabled && <View style={{ alignSelf: 'center', marginLeft: 16, padding: 15 }} />}
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: 'row', alignContent: 'space-between', justifyContent: 'center', paddingTop: 16, paddingBottom: 2 }}
            >
              {this.state.unit === BitcoinUnit.LOCAL_CURRENCY && (
                <Text
                  style={{
                    color: this.props.disabled
                      ? BlueCurrentTheme.colors.buttonDisabledTextColor
                      : BlueCurrentTheme.colors.alternativeTextColor2,
                    fontSize: 18,
                    marginHorizontal: 4,
                    fontWeight: 'bold',
                    alignSelf: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currency.getCurrencySymbol() + ' '}
                </Text>
              )}
              <TextInput
                {...this.props}
                testID="BitcoinAmountInput"
                keyboardType="numeric"
                adjustsFontSizeToFit
                onChangeText={text => {
                  text = text.trim();
                  if (this.state.unit !== BitcoinUnit.LOCAL_CURRENCY) {
                    text = text.replace(',', '.');
                    const split = text.split('.');
                    if (split.length >= 2) {
                      text = `${parseInt(split[0], 10)}.${split[1]}`;
                    } else {
                      text = `${parseInt(split[0], 10)}`;
                    }
                    text = this.state.unit === BitcoinUnit.BTC ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');
                    text = text.replace(/(\..*)\./g, '$1');

                    if (text.startsWith('.')) {
                      text = '0.';
                    }
                    text = text.replace(/(0{1,}.)\./g, '$1');
                    if (this.state.unit !== BitcoinUnit.BTC) {
                      text = text.replace(/[^0-9.]/g, '');
                    }
                  } else if (this.state.unit === BitcoinUnit.LOCAL_CURRENCY) {
                    text = text.replace(/,/gi, '');
                    if (text.split('.').length > 2) {
                      // too many dots. stupid code to remove all but first dot:
                      let rez = '';
                      let first = true;
                      for (const part of text.split('.')) {
                        rez += part;
                        if (first) {
                          rez += '.';
                          first = false;
                        }
                      }
                      text = rez;
                    }
                    text = text.replace(/[^\d.,-]/g, ''); // remove all but numberd, dots & commas
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
                maxLength={this.maxLength()}
                ref={textInput => (this.textInput = textInput)}
                editable={!this.props.isLoading && !this.props.disabled}
                value={parseFloat(amount) > 0 || amount === BitcoinUnit.MAX ? amount : undefined}
                placeholderTextColor={
                  this.props.disabled ? BlueCurrentTheme.colors.buttonDisabledTextColor : BlueCurrentTheme.colors.alternativeTextColor2
                }
                style={{
                  color: this.props.disabled
                    ? BlueCurrentTheme.colors.buttonDisabledTextColor
                    : BlueCurrentTheme.colors.alternativeTextColor2,
                  fontWeight: 'bold',
                  fontSize: amount.length > 10 ? 20 : 36,
                }}
              />
              {this.state.unit !== BitcoinUnit.LOCAL_CURRENCY && (
                <Text
                  style={{
                    color: this.props.disabled
                      ? BlueCurrentTheme.colors.buttonDisabledTextColor
                      : BlueCurrentTheme.colors.alternativeTextColor2,
                    fontSize: 15,
                    marginHorizontal: 4,
                    fontWeight: '600',
                    alignSelf: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {' ' + this.state.unit}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <Text style={{ fontSize: 16, color: '#9BA0A9', fontWeight: '600' }}>
                {this.state.unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX
                  ? removeTrailingZeros(secondaryDisplayCurrency)
                  : secondaryDisplayCurrency}
                {this.state.unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX ? ` ${BitcoinUnit.BTC}` : null}
              </Text>
            </View>
          </View>
          {!this.props.disabled && (
            <TouchableOpacity
              style={{ alignSelf: 'center', marginRight: 16, paddingLeft: 16, paddingVertical: 16 }}
              onPress={this.changeAmountUnit}
            >
              <Image source={require('./img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          )}
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

export function BlueBigCheckmark({ style }) {
  const defaultStyles = {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  };
  const mergedStyles = { ...defaultStyles, ...style };
  return (
    <View style={mergedStyles}>
      <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
    </View>
  );
}

const tabsStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: 50,
    borderColor: '#e3e3e3',
    borderBottomWidth: 1,
  },
  tabRoot: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderBottomWidth: 2,
  },
});

export const BlueTabs = ({ active, onSwitch, tabs }) => (
  <View style={tabsStyles.root}>
    {tabs.map((Tab, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => onSwitch(i)}
        style={[
          tabsStyles.tabRoot,
          active === i && {
            borderColor: BlueCurrentTheme.colors.buttonAlternativeTextColor,
            borderBottomWidth: 2,
          },
          { width: width / tabs.length },
        ]}
      >
        <Tab active={active === i} />
      </TouchableOpacity>
    ))}
  </View>
);

export class DynamicQRCode extends Component {
  constructor() {
    super();
    const qrCodeHeight = height > width ? width - 40 : width / 3;
    const qrCodeMaxHeight = 370;
    this.state = {
      index: 0,
      total: 0,
      qrCodeHeight: Math.min(qrCodeHeight, qrCodeMaxHeight),
      intervalHandler: null,
    };
  }

  fragments = [];

  componentDidMount() {
    const { value, capacity = 800 } = this.props;
    this.fragments = encodeUR(value, capacity);
    this.setState(
      {
        total: this.fragments.length,
      },
      () => {
        this.startAutoMove();
      },
    );
  }

  moveToNextFragment = () => {
    const { index, total } = this.state;
    if (index === total - 1) {
      this.setState({
        index: 0,
      });
    } else {
      this.setState(state => ({
        index: state.index + 1,
      }));
    }
  };

  startAutoMove = () => {
    if (!this.state.intervalHandler)
      this.setState(() => ({
        intervalHandler: setInterval(this.moveToNextFragment, 500),
      }));
  };

  stopAutoMove = () => {
    clearInterval(this.state.intervalHandler);
    this.setState(() => ({
      intervalHandler: null,
    }));
  };

  moveToPreviousFragment = () => {
    const { index, total } = this.state;
    if (index > 0) {
      this.setState(state => ({
        index: state.index - 1,
      }));
    } else {
      this.setState(state => ({
        index: total - 1,
      }));
    }
  };

  render() {
    const currentFragment = this.fragments[this.state.index];
    return currentFragment ? (
      <View style={animatedQRCodeStyle.container}>
        <BlueSpacing20 />
        <View style={animatedQRCodeStyle.qrcodeContainer}>
          <QRCode
            value={currentFragment.toUpperCase()}
            size={this.state.qrCodeHeight}
            color="#000000"
            logoBackgroundColor={BlueCurrentTheme.colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="L"
          />
        </View>
        <BlueSpacing20 />
        <View>
          <Text style={animatedQRCodeStyle.text}>
            {loc.formatString(loc._.of, { number: this.state.index + 1, total: this.state.total })}
          </Text>
        </View>
        <BlueSpacing20 />
        <View style={animatedQRCodeStyle.controller}>
          <TouchableOpacity
            style={[animatedQRCodeStyle.button, { width: '25%', alignItems: 'flex-start' }]}
            onPress={this.moveToPreviousFragment}
          >
            <Text style={animatedQRCodeStyle.text}>{loc.send.dynamic_prev}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[animatedQRCodeStyle.button, { width: '50%' }]}
            onPress={this.state.intervalHandler ? this.stopAutoMove : this.startAutoMove}
          >
            <Text style={animatedQRCodeStyle.text}>{this.state.intervalHandler ? loc.send.dynamic_stop : loc.send.dynamic_start}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[animatedQRCodeStyle.button, { width: '25%', alignItems: 'flex-end' }]}
            onPress={this.moveToNextFragment}
          >
            <Text style={animatedQRCodeStyle.text}>{loc.send.dynamic_next}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View>
        <Text>{loc.send.dynamic_init}</Text>
      </View>
    );
  }
}

const animatedQRCodeStyle = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
    margin: 6,
  },
  controller: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 25,
    height: 45,
    paddingHorizontal: 18,
  },
  button: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: 'bold',
  },
});
