import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import { BlueSpacing20 } from '../../BlueComponents';
import { MultisigHDWallet } from '../../class';
import BottomModal, { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import ListItem from '../../components/ListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisig'>;
type RouteProps = RouteProp<AddWalletStackParamList, 'WalletsAddMultisig'>;

const WalletsAddMultisig: React.FC = () => {
  const { colors } = useTheme();
  const { navigate, setOptions } = useExtendedNavigation<NavigationProps>();
  const { walletLabel } = useRoute<RouteProps>().params;
  const bottomModalRef = useRef<BottomModalHandle>(null);

  // Actual state variables
  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [format, setFormat] = useState(MultisigHDWallet.FORMAT_P2WSH);

  // Temporary state variables for modal
  const [tempM, setTempM] = useState(m);
  const [tempN, setTempN] = useState(n);
  const [tempFormat, setTempFormat] = useState(format);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
    textSubtitle: {
      color: colors.alternativeTextColor,
    },
    selectedItem: {
      paddingHorizontal: 8,
      backgroundColor: colors.elevated,
    },
    deSelectedItem: {
      paddingHorizontal: 8,
      backgroundColor: 'transparent',
    },
    textHeader: {
      color: colors.outputValue,
    },
  });

  const onLetsStartPress = () => {
    bottomModalRef.current?.dismiss();
    navigate('WalletsAddMultisigStep2', { m, n, format, walletLabel });
  };

  // Setters for temporary state variables
  const setFormatP2wsh = () => setTempFormat(MultisigHDWallet.FORMAT_P2WSH);
  const setFormatP2shP2wsh = () => setTempFormat(MultisigHDWallet.FORMAT_P2SH_P2WSH);
  const setFormatP2sh = () => setTempFormat(MultisigHDWallet.FORMAT_P2SH);

  const isP2wsh = () => tempFormat === MultisigHDWallet.FORMAT_P2WSH;
  const isP2shP2wsh = () => tempFormat === MultisigHDWallet.FORMAT_P2SH_P2WSH || tempFormat === MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT;
  const isP2sh = () => tempFormat === MultisigHDWallet.FORMAT_P2SH;

  const increaseTempM = () => {
    if (tempN === tempM) return;
    if (tempM === 7) return;
    setTempM(tempM + 1);
  };
  const decreaseTempM = () => {
    if (tempM === 2) return;
    setTempM(tempM - 1);
  };

  const increaseTempN = () => {
    if (tempN === 7) return;
    setTempN(tempN + 1);
  };
  const decreaseTempN = () => {
    if (tempN === tempM) return;
    setTempN(tempN - 1);
  };

  const showAdvancedOptionsModal = useCallback(() => {
    setTempM(m);
    setTempN(n);
    setTempFormat(format);
    bottomModalRef.current?.present();
  }, [format, m, n]);

  const HeaderRight = useMemo(
    () => (
      <TouchableOpacity onPress={showAdvancedOptionsModal} testID="HeaderRightButton">
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </TouchableOpacity>
    ),
    [colors.foregroundColor, showAdvancedOptionsModal],
  );

  useEffect(() => {
    setOptions({
      headerRight: () => HeaderRight,
    });
  }, [HeaderRight, colors.foregroundColor, setOptions]);

  const resetWalletOptions = async () => {
    setTempM(2);
    setTempN(3);
    setTempFormat(MultisigHDWallet.FORMAT_P2WSH);
  };

  const applyWalletOptions = async () => {
    setM(tempM);
    setN(tempN);
    setFormat(tempFormat);
    await bottomModalRef.current?.dismiss();
  };

  const renderModal = () => {
    const isResetDisabled = tempM === 2 && tempN === 3 && tempFormat === MultisigHDWallet.FORMAT_P2WSH;

    return (
      <BottomModal
        sizes={['auto', 'large']}
        ref={bottomModalRef}
        contentContainerStyle={styles.modalContentShort}
        backgroundColor={colors.elevated}
        footer={
          <View style={styles.modalButtonContainer}>
            <Button testID="ResetWalletOptionsButton" title={loc.receive.reset} onPress={resetWalletOptions} disabled={isResetDisabled} />
            <View style={styles.modalButtonSpacing} />
            <Button testID="ApplyWalletOptionsButton" title={loc._.ok} onPress={applyWalletOptions} />
          </View>
        }
      >
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.quorum_header}</Text>
        <Text style={[styles.textSubtitle, stylesHook.textSubtitle]}>{loc.multisig.required_keys_out_of_total}</Text>
        <View style={styles.rowCenter}>
          <View style={styles.column}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={increaseTempM}
              disabled={tempN === tempM || tempM === 7}
              style={styles.chevron}
            >
              <Icon
                name="chevron-up"
                size={22}
                type="font-awesome-5"
                color={tempN === tempM || tempM === 7 ? colors.buttonDisabledTextColor : '#007AFF'}
              />
            </TouchableOpacity>
            <Text style={[styles.textM, stylesHook.textHeader]}>{tempM}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={decreaseTempM} disabled={tempM === 2} style={styles.chevron}>
              <Icon name="chevron-down" size={22} type="font-awesome-5" color={tempM === 2 ? colors.buttonDisabledTextColor : '#007AFF'} />
            </TouchableOpacity>
          </View>

          <View style={styles.columnOf}>
            <Text style={styles.textOf}>{loc.multisig.of}</Text>
          </View>

          <View style={styles.column}>
            <TouchableOpacity accessibilityRole="button" disabled={tempN === 7} onPress={increaseTempN} style={styles.chevron}>
              <Icon name="chevron-up" size={22} type="font-awesome-5" color={tempN === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
            </TouchableOpacity>
            <Text style={[styles.textM, stylesHook.textHeader]}>{tempN}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={decreaseTempN}
              disabled={tempN === tempM}
              style={styles.chevron}
              testID="DecreaseN"
            >
              <Icon
                name="chevron-down"
                size={22}
                type="font-awesome-5"
                color={tempN === tempM ? colors.buttonDisabledTextColor : '#007AFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <BlueSpacing20 />

        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.wallet_type}</Text>
        <BlueSpacing20 />
        <ListItem
          bottomDivider={false}
          onPress={setFormatP2wsh}
          title={`${loc.multisig.native_segwit_title} (${MultisigHDWallet.FORMAT_P2WSH})`}
          checkmark={isP2wsh()}
          containerStyle={[styles.borderRadius6, styles.item, isP2wsh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
        />
        <ListItem
          bottomDivider={false}
          onPress={setFormatP2shP2wsh}
          title={`${loc.multisig.wrapped_segwit_title} (${MultisigHDWallet.FORMAT_P2SH_P2WSH})`}
          checkmark={isP2shP2wsh()}
          containerStyle={[styles.borderRadius6, styles.item, isP2shP2wsh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
        />
        <ListItem
          bottomDivider={false}
          onPress={setFormatP2sh}
          title={`${loc.multisig.legacy_title} (${MultisigHDWallet.FORMAT_P2SH})`}
          checkmark={isP2sh()}
          containerStyle={[styles.borderRadius6, styles.item, isP2sh() ? stylesHook.selectedItem : stylesHook.deSelectedItem]}
        />
      </BottomModal>
    );
  };
  return (
    <SafeArea style={stylesHook.root}>
      <View style={styles.descriptionContainer}>
        <View style={styles.imageWrapper}>
          <LottieView source={require('../../img/msvault.json')} style={styles.lottie} autoPlay loop={false} />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.multisig.what_is_vault}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {loc.formatString(loc.multisig.what_is_vault_numberOfWallets, { tempM, tempN })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.multisig.what_is_vault_wallet}</Text>
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.multisig.needs}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {loc.formatString(loc.multisig.what_is_vault_description_number_of_vault_keys, { tempM })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>
            {tempM === 2 && tempN === 3
              ? loc.multisig.what_is_vault_description_to_spend
              : loc.multisig.what_is_vault_description_to_spend_other}
          </Text>
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          testID="LetsStart"
          buttonTextColor={colors.buttonAlternativeTextColor}
          title={loc.multisig.lets_start}
          onPress={onLetsStartPress}
        />
      </View>
      {renderModal()}
    </SafeArea>
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
    padding: 24,
  },
  borderRadius6: {
    borderRadius: 6,
    minHeight: 54,
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  textdescBold: {
    fontWeight: '700',
    alignSelf: 'center',
    textAlign: 'center',
  },
  modalButtonSpacing: {
    width: 16,
  },
  textM: {
    fontSize: 50,
    fontWeight: '700',
  },
  textOf: {
    fontSize: 30,
    color: '#9AA0AA',
  },
  lottie: {
    width: 233,
    height: 176,
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
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

export default WalletsAddMultisig;
