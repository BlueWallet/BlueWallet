import React, { useState, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Icon } from 'react-native-elements';
import { BlueButton, BlueNavigationStyle, BlueSpacing20 } from '../../BlueComponents';
import { MultisigHDWallet } from '../../class';
import { useNavigation, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

const WalletsAddMultisig = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const loadingAnimation = useRef();

  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [format, setFormat] = useState(MultisigHDWallet.FORMAT_P2WSH);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
    whiteBackground: { backgroundColor: colors.background },
    itemNameWrapper: { backgroundColor: colors.elevated },
    nativeName: { color: colors.foregroundColor },
    filteTextWrapper: { color: colors.foregroundColor, right: 0, position: 'absolute' },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
  });

  const onLetsStartPress = () => {
    navigate('WalletsAddMultisigStep2', { m, n, format });
  };

  const setFormatP2wsh = () => setFormat(MultisigHDWallet.FORMAT_P2WSH);

  const setFormatP2shP2wsh = () => setFormat(MultisigHDWallet.FORMAT_P2SH_P2WSH);

  const setFormatP2sh = () => setFormat(MultisigHDWallet.FORMAT_P2SH);

  const getCurrentlySelectedFormat = code => {
    switch (code) {
      case 'format':
        return WalletsAddMultisig.getCurrentFormatReadable(format);
      case 'quorum':
        return loc.formatString(loc.multisig.quorum, { m, n });
      default:
        throw new Error('This should never happen');
    }
  };

  const isP2wsh = () => format === MultisigHDWallet.FORMAT_P2WSH;

  const isP2shP2wsh = () => format === MultisigHDWallet.FORMAT_P2SH_P2WSH;

  const isP2sh = () => format === MultisigHDWallet.FORMAT_P2SH;

  const increaseM = () => {
    if (n === m) return;
    if (m === 7) return;
    setM(m + 1);
  };
  const decreaseM = () => {
    if (m === 2) return;
    setM(m - 1);
  };

  const increaseN = () => {
    if (n === 7) return;
    setN(n + 1);
  };
  const decreaseN = () => {
    if (n === m) return;
    setN(n - 1);
  };

  const renderModal = () => {
    return (
      <Modal
        isVisible={isModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setIsModalVisible(false);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContentShort, styles.modalContentShort]}>
            <Text style={styles.textHeader}>{loc.multisig.quorum_header}</Text>
            <View style={styles.rowCenter}>
              <View style={styles.column}>
                <TouchableOpacity onPress={increaseM} style={styles.chevron}>
                  <Icon name="chevron-up" size={22} type="octicon" color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.textM}>{m}</Text>
                <TouchableOpacity onPress={decreaseM} style={styles.chevron}>
                  <Icon name="chevron-down" size={22} type="octicon" color="#007AFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.columnOf}>
                <Text style={styles.textOf}>{loc.multisig.of}</Text>
              </View>

              <View style={styles.column}>
                <TouchableOpacity onPress={increaseN} style={styles.chevron}>
                  <Icon name="chevron-up" size={22} type="octicon" color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.textM}>{n}</Text>
                <TouchableOpacity onPress={decreaseN} style={styles.chevron}>
                  <Icon name="chevron-down" size={22} type="octicon" color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            <BlueSpacing20 />

            <Text style={styles.textHeader}>{loc.multisig.wallet_type}</Text>
            <BlueSpacing20 />

            <TouchableOpacity
              onPress={setFormatP2wsh}
              style={[styles.formatSelectorTextWrapper, isP2wsh() ? styles.formatSelectorTextWrapperSelected : null]}
            >
              <Text style={styles.formatSelectorText}>
                {loc.multisig.native_segwit_title} ({MultisigHDWallet.FORMAT_P2WSH})
                {isP2wsh() && <Icon name="check" color="#007AFF" size={17} type="octicon" />}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={setFormatP2shP2wsh}
              style={[styles.formatSelectorTextWrapper, isP2shP2wsh() ? styles.formatSelectorTextWrapperSelected : null]}
            >
              <Text style={styles.formatSelectorText}>
                {loc.multisig.wrapped_segwit_title} ({MultisigHDWallet.FORMAT_P2SH_P2WSH})
                {isP2shP2wsh() && <Icon name="check" color="#007AFF" size={17} type="octicon" />}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={setFormatP2sh}
              style={[styles.formatSelectorTextWrapper, isP2sh() ? styles.formatSelectorTextWrapperSelected : null]}
            >
              <Text style={styles.formatSelectorText}>
                {loc.multisig.legacy_title} ({MultisigHDWallet.FORMAT_P2SH})
                {isP2sh() && <Icon name="check" color="#007AFF" size={17} type="octicon" />}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={stylesHook.root}>
      <StatusBar barStyle="default" />
      <View style={styles.descriptionContainer}>
        <View style={styles.imageWrapper}>
          <LottieView source={require('../../img/msvault.json')} autoPlay ref={loadingAnimation} loop={false} />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.multisig.what_is_vault}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {loc.formatString(loc.multisig.what_is_vault_numberOfWallets, { m, n })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.multisig.what_is_vault_wallet}</Text>
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.multisig.needs}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {loc.formatString(loc.multisig.what_is_vault_description_number_of_vault_keys, { m })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.multisig.what_is_vault_description_to_spend}</Text>
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <BlueButton buttonTextColor={colors.buttonAlternativeTextColor} title={loc.multisig.lets_start} onPress={onLetsStartPress} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalFlatList: { width: '100%' },
  itemNameWrapper: { flexDirection: 'row', paddingTop: 20, paddingBottom: 0 },
  textWrapper: { paddingLeft: 10, flex: 1, flexDirection: 'row' },
  nativeName: { fontSize: 16 },
  filteTextWrapper: { right: 0, position: 'absolute' },
  filterText: { fontSize: 16, color: 'gray' },

  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  descriptionContainer: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  modalContentShort: {
    padding: 24,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 350,
  },
  formatSelectorTextWrapper: {
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderColor: 0,
  },
  formatSelectorTextWrapperSelected: {
    backgroundColor: '#EEF0F4',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderColor: 0,
  },
  buttonContainer: {
    width: 263,
    alignSelf: 'center',
    justifyContent: 'flex-end',
    marginVertical: 24,
  },
  formatSelectorText: {
    color: '#13244D',
    fontSize: 16,
    fontWeight: '500',
  },
  column: {
    paddingRight: 20,
    paddingLeft: 20,
  },
  chevron: {
    paddingBottom: 10,
    paddingTop: 10,
    fontSize: 24,
  },
  columnOf: {
    paddingRight: 20,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  textdesc: {
    fontWeight: '500',
    alignSelf: 'center',
    textAlign: 'center',
  },
  textdescBold: {
    fontWeight: '700',
    alignSelf: 'center',
    textAlign: 'center',
  },
  textM: {
    fontSize: 50,
    fontWeight: '700',
  },
  textOf: {
    fontSize: 30,
    color: '#9AA0AA',
  },
  textHeader: {
    color: '#13244D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageWrapper: {
    borderWidth: 0,
    flexDirection: 'row',
    height: 160,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

WalletsAddMultisig.getCurrentFormatReadable = f => {
  switch (f) {
    case MultisigHDWallet.FORMAT_P2WSH:
      return loc.multisig.native_segwit_title;
    case MultisigHDWallet.FORMAT_P2SH_P2WSH:
    case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
      return loc.multisig.wrapped_segwit_title;
    case MultisigHDWallet.FORMAT_P2SH:
      return loc.multisig.legacy_title;
    default:
      throw new Error('This should never happen');
  }
};

WalletsAddMultisig.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  headerTitle: null,
});

export default WalletsAddMultisig;
