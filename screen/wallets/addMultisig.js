import React, { useState, useRef, useEffect, useContext } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Icon } from 'react-native-elements';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueButton, BlueListItem, BlueSpacing20 } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import BottomModal from '../../components/BottomModal';
import { MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';

const WalletsAddMultisig = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const loadingAnimation = useRef();
  const { walletLabel = loc.multisig.default_label } = useRoute().params;
  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [format, setFormat] = useState(MultisigHDWallet.FORMAT_P2WSH);
  const { isAdvancedModeEnabled } = useContext(BlueStorageContext);
  const [isAdvancedModeEnabledRender, setIsAdvancedModeEnabledRender] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    textSubtitle: {
      color: colors.alternativeTextColor,
    },
    selectedItem: {
      backgroundColor: colors.elevated,
    },
    deSelectedItem: {
      backgroundColor: 'transparent',
    },
    textHeader: {
      color: colors.outputValue,
    },
  });

  useEffect(() => {
    if (loadingAnimation.current) {
      /*
      https://github.com/lottie-react-native/lottie-react-native/issues/832#issuecomment-1008209732
      Temporary workaround until Lottie is fixed.
      */
      setTimeout(() => {
        loadingAnimation.current?.reset();
        loadingAnimation.current?.play();
      }, 100);
    }
  }, []);

  useEffect(() => {
    isAdvancedModeEnabled().then(setIsAdvancedModeEnabledRender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLetsStartPress = () => {
    navigate('WalletsAddMultisigStep2', { m, n, format, walletLabel });
  };

  const setFormatP2wsh = () => setFormat(MultisigHDWallet.FORMAT_P2WSH);

  const setFormatP2shP2wsh = () => setFormat(MultisigHDWallet.FORMAT_P2SH_P2WSH);

  const setFormatP2sh = () => setFormat(MultisigHDWallet.FORMAT_P2SH);

  const isP2wsh = () => format === MultisigHDWallet.FORMAT_P2WSH;

  const isP2shP2wsh = () => format === MultisigHDWallet.FORMAT_P2SH_P2WSH || format === MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT;

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

  const closeModal = () => {
    Keyboard.dismiss();
    setIsModalVisible(false);
  };

  const renderModal = () => {
    return (
      <BottomModal isVisible={isModalVisible} onClose={closeModal} doneButton propagateSwipe>
        <View style={[styles.modalContentShort, stylesHook.modalContentShort]}>
          <ScrollView>
            <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.quorum_header}</Text>
            <Text style={[styles.textSubtitle, stylesHook.textSubtitle]}>{loc.multisig.required_keys_out_of_total}</Text>
            <View style={styles.rowCenter}>
              <View style={styles.column}>
                <TouchableOpacity accessibilityRole="button" onPress={increaseM} disabled={n === m || m === 7} style={styles.chevron}>
                  <Icon
                    name="chevron-up"
                    size={22}
                    type="octicon"
                    color={n === m || m === 7 ? colors.buttonDisabledTextColor : '#007AFF'}
                  />
                </TouchableOpacity>
                <Text style={[styles.textM, stylesHook.textHeader]}>{m}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={decreaseM} disabled={m === 2} style={styles.chevron}>
                  <Icon name="chevron-down" size={22} type="octicon" color={m === 2 ? colors.buttonDisabledTextColor : '#007AFF'} />
                </TouchableOpacity>
              </View>

              <View style={styles.columnOf}>
                <Text style={styles.textOf}>{loc.multisig.of}</Text>
              </View>

              <View style={styles.column}>
                <TouchableOpacity accessibilityRole="button" disabled={n === 7} onPress={increaseN} style={styles.chevron}>
                  <Icon name="chevron-up" size={22} type="octicon" color={n === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
                </TouchableOpacity>
                <Text style={[styles.textM, stylesHook.textHeader]}>{n}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={decreaseN} disabled={n === m} style={styles.chevron}>
                  <Icon name="chevron-down" size={22} type="octicon" color={n === m ? colors.buttonDisabledTextColor : '#007AFF'} />
                </TouchableOpacity>
              </View>
            </View>

            <BlueSpacing20 />

            <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.wallet_type}</Text>
            <BlueSpacing20 />
            <BlueListItem
              bottomDivider={false}
              onPress={setFormatP2wsh}
              title={`${loc.multisig.native_segwit_title} (${MultisigHDWallet.FORMAT_P2WSH})`}
              checkmark={isP2wsh()}
              containerStyle={[styles.borderRadius6, styles.item, isP2wsh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
            />
            <BlueListItem
              bottomDivider={false}
              onPress={setFormatP2shP2wsh}
              title={`${loc.multisig.wrapped_segwit_title} (${MultisigHDWallet.FORMAT_P2SH_P2WSH})`}
              checkmark={isP2shP2wsh()}
              containerStyle={[styles.borderRadius6, styles.item, isP2shP2wsh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
            />
            <BlueListItem
              bottomDivider={false}
              onPress={setFormatP2sh}
              title={`${loc.multisig.legacy_title} (${MultisigHDWallet.FORMAT_P2SH})`}
              checkmark={isP2sh()}
              containerStyle={[styles.borderRadius6, styles.item, isP2sh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
            />
          </ScrollView>
        </View>
      </BottomModal>
    );
  };

  const showAdvancedOptionsModal = () => {
    setIsModalVisible(true);
  };

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

  return (
    <SafeAreaView style={stylesHook.root}>
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
          <Text style={[styles.textdesc, stylesHook.textdesc]}>
            {m === 2 && n === 3 ? loc.multisig.what_is_vault_description_to_spend : loc.multisig.what_is_vault_description_to_spend_other}
          </Text>
        </Text>
      </View>
      {isAdvancedModeEnabledRender && (
        <View>
          <BlueListItem
            onPress={showAdvancedOptionsModal}
            title={loc.multisig.vault_advanced_customize}
            subtitle={`${getCurrentlySelectedFormat('format')}, ${getCurrentlySelectedFormat('quorum')}`}
            chevron
          />
        </View>
      )}
      <View style={styles.buttonContainer}>
        <BlueButton buttonTextColor={colors.buttonAlternativeTextColor} title={loc.multisig.lets_start} onPress={onLetsStartPress} />
      </View>
      {renderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 0,
  },
  descriptionContainer: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  modalContentShort: {
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 350,
  },
  borderRadius6: {
    borderRadius: 6,
  },
  buttonContainer: {
    padding: 24,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  textSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
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

WalletsAddMultisig.navigationOptions = navigationStyle({
  headerTitle: null,
});

export default WalletsAddMultisig;
