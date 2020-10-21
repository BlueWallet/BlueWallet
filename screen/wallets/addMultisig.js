import React, { useState, useRef } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Icon } from 'react-native-elements';
import { BlueButtonHook, BlueNavigationStyle, BlueSpacing20, BlueSpacing40, BlueTextCenteredHooks } from '../../BlueComponents';
import { MultisigHDWallet } from '../../class';
import { useNavigation, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import Modal from 'react-native-modal';

const WalletsAddMultisig = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const loadingAnimation = useRef();

  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [format, setFormat] = useState(MultisigHDWallet.FORMAT_P2WSH);

  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
      padding: 20,
    },
    textdesc: { 
      color: colors.alternativeTextColor,
    },
  };

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
          <View style={styles.modalContentShort}>
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
    <ScrollView style={stylesHook.root}>
      <StatusBar barStyle="default" />
      <BlueSpacing20 />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <View style={styles.imageWrapper}>
          <LottieView
            source={require('../../img/msvault.json')}
            autoPlay
            ref={loadingAnimation}
            loop={false}
           />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.formatString(loc.multisig.what_is_vault, { m, n })}</Text>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.formatString(loc.multisig.it_will_require, { m })}</Text>

        <BlueSpacing40 />
        <BlueSpacing40 />

        <FlatList
          scrollEnabled={false}
          style={styles.modalFlatList}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          data={[{ code: 'format' }, { code: 'quorum' }]}
          keyExtractor={(item, index) => item.code}
          renderItem={({ item, index, separators }) => (
            <TouchableHighlight
              onShowUnderlay={separators.highlight}
              onHideUnderlay={separators.unhighlight}
              onPress={() => {
                setIsModalVisible(true);
              }}
            >
              <View style={styles.whiteBackground}>
                <View style={styles.itemNameWrapper}>
                  <View style={styles.textWrapper}>
                    <Text style={styles.nativeName}>{getCurrentlySelectedFormat(item.code)}</Text>
                    <View style={styles.filteTextWrapper}>
                      <Text style={styles.filterText}>{'   ❯'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableHighlight>
          )}
        />

        <BlueSpacing40 />

        <BlueButtonHook title={loc.multisig.lets_start} onPress={onLetsStartPress} />
      </KeyboardAvoidingView>

      {renderModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  modalFlatList: { width: '100%' },
  whiteBackground: { backgroundColor: BlueCurrentTheme.colors.background },
  itemNameWrapper: { backgroundColor: BlueCurrentTheme.colors.elevated, flex: 1, flexDirection: 'row', paddingTop: 20, paddingBottom: 0 },
  textWrapper: { paddingLeft: 10, flex: 1, flexDirection: 'row' },
  nativeName: { fontSize: 16, color: BlueCurrentTheme.colors.foregroundColor },
  filteTextWrapper: { color: BlueCurrentTheme.colors.foregroundColor, right: 0, position: 'absolute' },
  filterText: { fontSize: 16, color: 'gray' },

  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContentShort: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
    justifyContent: 'center',
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

WalletsAddMultisig.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  headerTitle: null,
  headerLeft: null,
});

export default WalletsAddMultisig;
