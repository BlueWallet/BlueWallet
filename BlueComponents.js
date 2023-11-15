/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { Component, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Icon, Text, Header, ListItem, Avatar } from 'react-native-elements';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
  I18nManager,
  ImageBackground,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import NetworkTransactionFees, { NetworkTransactionFee, NetworkTransactionFeeType } from './models/networkTransactionFees';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueCurrentTheme, useTheme } from './components/themes';
import PlusIcon from './components/icons/PlusIcon';
import loc, { formatStringAddTwoWhiteSpaces } from './loc';

const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export const SecondButton = forwardRef((props, ref) => {
  const { colors } = useTheme();
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.buttonBlueBackgroundColor;
  let fontColor = colors.buttonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={{
        borderWidth: 0.7,
        borderColor: 'transparent',
        backgroundColor,
        minHeight: 45,
        height: 45,
        maxHeight: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        flexGrow: 1,
      }}
      {...props}
      ref={ref}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
        {props.title && <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{props.title}</Text>}
      </View>
    </TouchableOpacity>
  );
});

export const BitcoinButton = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity accessibilityRole="button" testID={props.testID} onPress={props.onPress}>
      <View
        style={{
          borderColor: (props.active && colors.newBlue) || colors.buttonDisabledBackgroundColor,
          borderWidth: 1.5,
          borderRadius: 8,
          backgroundColor: colors.buttonDisabledBackgroundColor,
          minWidth: props.style.width,
          minHeight: props.style.height,
          height: props.style.height,
          flex: 1,
          marginBottom: 8,
        }}
      >
        <View style={{ marginHorizontal: 16, marginVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Image style={{ width: 34, height: 34, marginRight: 8 }} source={require('./img/addWallet/bitcoin.png')} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.newBlue, fontWeight: 'bold', fontSize: 18, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
              {loc.wallets.add_bitcoin}
            </Text>
            <Text
              style={{
                color: colors.alternativeTextColor,
                fontSize: 13,
                fontWeight: '500',
                writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
              }}
            >
              {loc.wallets.add_bitcoin_explain}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const VaultButton = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity accessibilityRole="button" testID={props.testID} onPress={props.onPress}>
      <View
        style={{
          borderColor: (props.active && colors.foregroundColor) || colors.buttonDisabledBackgroundColor,
          borderWidth: 1.5,
          borderRadius: 8,
          backgroundColor: colors.buttonDisabledBackgroundColor,
          minWidth: props.style.width,
          minHeight: props.style.height,
          height: props.style.height,
          flex: 1,
        }}
      >
        <View style={{ marginHorizontal: 16, marginVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Image style={{ width: 34, height: 34, marginRight: 8 }} source={require('./img/addWallet/vault.png')} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foregroundColor,
                fontWeight: 'bold',
                fontSize: 18,
                writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
              }}
            >
              {loc.multisig.multisig_vault}
            </Text>
            <Text
              style={{
                color: colors.alternativeTextColor,
                fontSize: 13,
                fontWeight: '500',
                writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
              }}
            >
              {loc.multisig.multisig_vault_explain}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const LightningButton = props => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
      <View
        style={{
          borderColor: (props.active && colors.lnborderColor) || colors.buttonDisabledBackgroundColor,
          borderWidth: 1.5,
          borderRadius: 8,
          backgroundColor: colors.buttonDisabledBackgroundColor,
          minWidth: props.style.width,
          minHeight: props.style.height,
          height: props.style.height,
          flex: 1,
          marginBottom: 8,
        }}
      >
        <View style={{ marginHorizontal: 16, marginVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Image style={{ width: 34, height: 34, marginRight: 8 }} source={require('./img/addWallet/lightning.png')} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.lnborderColor, fontWeight: 'bold', fontSize: 18, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}
            >
              {loc.wallets.add_lightning}
            </Text>
            <Text
              style={{
                color: colors.alternativeTextColor,
                fontSize: 13,
                fontWeight: '500',
                writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
              }}
            >
              {loc.wallets.add_lightning_explain}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * TODO: remove this comment once this file gets properly converted to typescript.
 *
 * @type {React.FC<any>}
 */
export const BlueButtonLink = forwardRef((props, ref) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={{
        minHeight: 60,
        minWidth: 100,
        justifyContent: 'center',
      }}
      {...props}
      ref={ref}
    >
      <Text style={{ color: colors.foregroundColor, textAlign: 'center', fontSize: 16 }}>{props.title}</Text>
    </TouchableOpacity>
  );
});

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

export const BluePrivateBalance = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 13, borderRadius: 9 }}>
      <ImageBackground
        blurRadius={6}
        style={{ backgroundColor: '#FFFFFF', opacity: 0.5, height: 30, width: 110, marginRight: 8, borderRadius: 9 }}
      />
      <Icon name="eye-slash" type="font-awesome" color="#FFFFFF" />
    </View>
  );
};

export const BlueCopyToClipboardButton = ({ stringToCopy, displayText = false }) => {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={() => Clipboard.setString(stringToCopy)}>
      <Text style={{ fontSize: 13, fontWeight: '400', color: '#68bbe1' }}>{displayText || loc.transactions.details_copy}</Text>
    </TouchableOpacity>
  );
};

export class BlueCopyTextToClipboard extends Component {
  static propTypes = {
    text: PropTypes.string,
    truncated: PropTypes.bool,
  };

  static defaultProps = {
    text: '',
    truncated: false,
  };

  constructor(props) {
    super(props);
    this.state = { hasTappedText: false, address: props.text };
  }

  static getDerivedStateFromProps(props, state) {
    if (state.hasTappedText) {
      return { hasTappedText: state.hasTappedText, address: state.address, truncated: props.truncated };
    } else {
      return { hasTappedText: state.hasTappedText, address: props.text, truncated: props.truncated };
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
        <TouchableOpacity
          accessibilityRole="button"
          onPress={this.copyToClipboard}
          disabled={this.state.hasTappedText}
          testID="BlueCopyTextToClipboard"
        >
          <Animated.Text
            style={styleCopyTextToClipboard.address}
            {...(this.props.truncated ? { numberOfLines: 1, ellipsizeMode: 'middle' } : { numberOfLines: 0 })}
            testID="AddressValue"
          >
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

export const SafeBlueArea = props => {
  const { style, ...nonStyleProps } = props;
  const { colors } = useTheme();
  const baseStyle = { flex: 1, backgroundColor: colors.background };
  return <SafeAreaView forceInset={{ horizontal: 'always' }} style={[baseStyle, style]} {...nonStyleProps} />;
};

export const BlueCard = props => {
  return <View {...props} style={{ padding: 20 }} />;
};

export const BlueText = props => {
  const { colors } = useTheme();
  const style = StyleSheet.compose({ color: colors.foregroundColor, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }, props.style);
  return <Text {...props} style={style} />;
};

export const BlueTextCentered = props => {
  const { colors } = useTheme();
  return <Text {...props} style={{ color: colors.foregroundColor, textAlign: 'center' }} />;
};

export const BlueListItem = React.memo(props => {
  const { colors } = useTheme();

  return (
    <ListItem
      containerStyle={props.containerStyle ?? { backgroundColor: 'transparent' }}
      Component={props.Component ?? TouchableOpacity}
      bottomDivider={props.bottomDivider !== undefined ? props.bottomDivider : true}
      topDivider={props.topDivider !== undefined ? props.topDivider : false}
      testID={props.testID}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      disabled={props.disabled}
      accessible={props.switch === undefined}
    >
      {props.leftAvatar && <Avatar>{props.leftAvatar}</Avatar>}
      {props.leftIcon && <Avatar icon={props.leftIcon} />}
      <ListItem.Content>
        <ListItem.Title
          style={{
            color: props.disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
            fontSize: 16,
            fontWeight: '500',
            writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
          }}
          numberOfLines={0}
          accessible={props.switch === undefined}
        >
          {props.title}
        </ListItem.Title>
        {props.subtitle && (
          <ListItem.Subtitle
            numberOfLines={props.subtitleNumberOfLines ?? 1}
            accessible={props.switch === undefined}
            style={{
              flexWrap: 'wrap',
              writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
              color: colors.alternativeTextColor,
              fontWeight: '400',
              fontSize: 14,
            }}
          >
            {props.subtitle}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {props.rightTitle && (
        <ListItem.Content right>
          <ListItem.Title style={props.rightTitleStyle} numberOfLines={0} right>
            {props.rightTitle}
          </ListItem.Title>
        </ListItem.Content>
      )}
      {props.isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {props.chevron && <ListItem.Chevron iconStyle={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />}
          {props.rightIcon && <Avatar icon={props.rightIcon} />}
          {props.switch && <Switch {...props.switch} accessibilityLabel={props.title} accessible accessibilityRole="switch" />}
          {props.checkmark && <ListItem.CheckBox iconType="octaicon" checkedColor="#0070FF" checkedIcon="check" checked />}
        </>
      )}
    </ListItem>
  );
});

export const BlueFormLabel = props => {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={{
        color: colors.foregroundColor,
        fontWeight: '400',
        marginHorizontal: 20,
        writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      }}
    />
  );
};

export const BlueFormMultiInput = props => {
  const { colors } = useTheme();

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
        borderColor: colors.formBorder,
        borderBottomColor: colors.formBorder,
        borderWidth: 1,
        borderBottomWidth: 0.5,
        borderRadius: 4,
        backgroundColor: colors.inputBackgroundColor,
        color: colors.foregroundColor,
        textAlignVertical: 'top',
      }}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      {...props}
      selectTextOnFocus={false}
      keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
    />
  );
};

export const BlueHeaderDefaultSub = props => {
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

export const BlueHeaderDefaultMain = props => {
  const { colors } = useTheme();
  const { isDrawerList } = props;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDrawerList ? colors.elevated : colors.background,
        paddingHorizontal: 16,
        borderTopColor: isDrawerList ? colors.elevated : colors.background,
        borderBottomColor: isDrawerList ? colors.elevated : colors.background,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          textAlign: 'left',
          fontWeight: 'bold',
          fontSize: 34,
          color: colors.foregroundColor,
        }}
      >
        {props.leftText}
      </Text>
      <PlusIcon accessibilityRole="button" accessibilityLabel={loc.wallets.add_title} onPress={props.onNewWalletPress} />
    </View>
  );
};

export const BlueSpacing = props => {
  return <View {...props} style={{ height: 60 }} />;
};

export const BlueSpacing40 = props => {
  return <View {...props} style={{ height: 50 }} />;
};

export class is {
  static ipad() {
    return isIpad;
  }
}

export const BlueSpacing20 = props => {
  const { horizontal = false } = props;
  return <View {...props} style={{ height: horizontal ? 0 : 20, width: horizontal ? 20 : 0, opacity: 0 }} />;
};

export const BlueSpacing10 = props => {
  return <View {...props} style={{ height: 10, opacity: 0 }} />;
};

export const BlueDismissKeyboardInputAccessory = () => {
  const { colors } = useTheme();
  BlueDismissKeyboardInputAccessory.InputAccessoryViewID = 'BlueDismissKeyboardInputAccessory';

  return Platform.OS !== 'ios' ? null : (
    <InputAccessoryView nativeID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}>
      <View
        style={{
          backgroundColor: colors.inputBackgroundColor,
          height: 44,
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <BlueButtonLink title={loc.send.input_done} onPress={Keyboard.dismiss} />
      </View>
    </InputAccessoryView>
  );
};

export const BlueDoneAndDismissKeyboardInputAccessory = props => {
  const { colors } = useTheme();
  BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID = 'BlueDoneAndDismissKeyboardInputAccessory';

  const onPasteTapped = async () => {
    const clipboard = await Clipboard.getString();
    props.onPasteTapped(clipboard);
  };

  const inputView = (
    <View
      style={{
        backgroundColor: colors.inputBackgroundColor,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        maxHeight: 44,
      }}
    >
      <BlueButtonLink title={loc.send.input_clear} onPress={props.onClearTapped} />
      <BlueButtonLink title={loc.send.input_paste} onPress={onPasteTapped} />
      <BlueButtonLink title={loc.send.input_done} onPress={Keyboard.dismiss} />
    </View>
  );

  if (Platform.OS === 'ios') {
    return <InputAccessoryView nativeID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}>{inputView}</InputAccessoryView>;
  } else {
    return <KeyboardAvoidingView>{inputView}</KeyboardAvoidingView>;
  }
};

export const BlueLoading = props => {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }} {...props}>
      <ActivityIndicator />
    </View>
  );
};

export class BlueReplaceFeeSuggestions extends Component {
  static propTypes = {
    onFeeSelected: PropTypes.func.isRequired,
    transactionMinimum: PropTypes.number.isRequired,
  };

  static defaultProps = {
    transactionMinimum: 1,
  };

  state = {
    customFeeValue: '1',
  };

  async componentDidMount() {
    try {
      const cachedNetworkTransactionFees = JSON.parse(await AsyncStorage.getItem(NetworkTransactionFee.StorageKey));

      if (cachedNetworkTransactionFees && 'fastestFee' in cachedNetworkTransactionFees) {
        this.setState({ networkFees: cachedNetworkTransactionFees }, () => this.onFeeSelected(NetworkTransactionFeeType.FAST));
      }
    } catch (_) {}
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
      this.props.onFeeSelected(Number(this.state.customFeeValue));
    }
  };

  onCustomFeeTextChange = customFee => {
    const customFeeValue = customFee.replace(/[^0-9]/g, '');
    this.setState({ customFeeValue, selectedFeeType: NetworkTransactionFeeType.CUSTOM }, () => {
      this.onFeeSelected(NetworkTransactionFeeType.CUSTOM);
    });
  };

  render() {
    const { networkFees, selectedFeeType } = this.state;

    return (
      <View>
        {networkFees &&
          [
            {
              label: loc.send.fee_fast,
              time: loc.send.fee_10m,
              type: NetworkTransactionFeeType.FAST,
              rate: networkFees.fastestFee,
              active: selectedFeeType === NetworkTransactionFeeType.FAST,
            },
            {
              label: formatStringAddTwoWhiteSpaces(loc.send.fee_medium),
              time: loc.send.fee_3h,
              type: NetworkTransactionFeeType.MEDIUM,
              rate: networkFees.mediumFee,
              active: selectedFeeType === NetworkTransactionFeeType.MEDIUM,
            },
            {
              label: loc.send.fee_slow,
              time: loc.send.fee_1d,
              type: NetworkTransactionFeeType.SLOW,
              rate: networkFees.slowFee,
              active: selectedFeeType === NetworkTransactionFeeType.SLOW,
            },
          ].map(({ label, type, time, rate, active }, index) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={label}
              onPress={() => this.onFeeSelected(type)}
              style={[
                { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10 },
                active && { borderRadius: 8, backgroundColor: BlueCurrentTheme.colors.incomingBackgroundColor },
              ]}
            >
              <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, color: BlueCurrentTheme.colors.successColor, fontWeight: '600' }}>{label}</Text>
                <View
                  style={{
                    backgroundColor: BlueCurrentTheme.colors.successColor,
                    borderRadius: 5,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: BlueCurrentTheme.colors.background }}>~{time}</Text>
                </View>
              </View>
              <View style={{ justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: BlueCurrentTheme.colors.successColor }}>{rate} sat/byte</Text>
              </View>
            </TouchableOpacity>
          ))}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => this.customTextInput.focus()}
          style={[
            { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10 },
            selectedFeeType === NetworkTransactionFeeType.CUSTOM && {
              borderRadius: 8,
              backgroundColor: BlueCurrentTheme.colors.incomingBackgroundColor,
            },
          ]}
        >
          <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, color: BlueCurrentTheme.colors.successColor, fontWeight: '600' }}>
              {formatStringAddTwoWhiteSpaces(loc.send.fee_custom)}
            </Text>
          </View>
          <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
            <TextInput
              onChangeText={this.onCustomFeeTextChange}
              keyboardType="numeric"
              value={this.state.customFeeValue}
              ref={ref => (this.customTextInput = ref)}
              maxLength={9}
              style={{
                backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
                borderBottomColor: BlueCurrentTheme.colors.formBorder,
                borderBottomWidth: 0.5,
                borderColor: BlueCurrentTheme.colors.formBorder,
                borderRadius: 4,
                borderWidth: 1.0,
                color: '#81868e',
                flex: 1,
                marginRight: 10,
                minHeight: 33,
                paddingRight: 5,
                paddingLeft: 5,
              }}
              onFocus={() => this.onCustomFeeTextChange(this.state.customFeeValue)}
              defaultValue={this.props.transactionMinimum}
              placeholder={loc.send.fee_satvbyte}
              placeholderTextColor="#81868e"
              inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            />
            <Text style={{ color: BlueCurrentTheme.colors.successColor }}>sat/byte</Text>
          </View>
        </TouchableOpacity>
        <BlueText style={{ color: BlueCurrentTheme.colors.alternativeTextColor }}>
          {loc.formatString(loc.send.fee_replace_minvb, { min: this.props.transactionMinimum })}
        </BlueText>
      </View>
    );
  }
}

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderBottomWidth: 2,
  },
});

export const BlueTabs = ({ active, onSwitch, tabs }) => (
  <View style={[tabsStyles.root, isIpad && { marginBottom: 30 }]}>
    {tabs.map((Tab, i) => (
      <TouchableOpacity
        key={i}
        accessibilityRole="button"
        onPress={() => onSwitch(i)}
        style={[
          tabsStyles.tabRoot,
          active === i && {
            borderColor: BlueCurrentTheme.colors.buttonAlternativeTextColor,
            borderBottomWidth: 2,
          },
        ]}
      >
        <Tab active={active === i} />
      </TouchableOpacity>
    ))}
  </View>
);
