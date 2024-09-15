import React, { useRef, useState } from 'react';
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
  const { navigate } = useExtendedNavigation<NavigationProps>();
  const { walletLabel } = useRoute<RouteProps>().params;
  const bottomModalRef = useRef<BottomModalHandle>(null);
  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
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

  const renderModal = () => {
    return (
      <BottomModal
        sizes={['auto', 'large']}
        ref={bottomModalRef}
        contentContainerStyle={styles.modalContentShort}
        backgroundColor={colors.elevated}
      >
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.quorum_header}</Text>
        <Text style={[styles.textSubtitle, stylesHook.textSubtitle]}>{loc.multisig.required_keys_out_of_total}</Text>
        <View style={styles.rowCenter}>
          <View style={styles.column}>
            <TouchableOpacity accessibilityRole="button" onPress={increaseM} disabled={n === m || m === 7} style={styles.chevron}>
              <Icon
                name="chevron-up"
                size={22}
                type="font-awesome-5"
                color={n === m || m === 7 ? colors.buttonDisabledTextColor : '#007AFF'}
              />
            </TouchableOpacity>
            <Text style={[styles.textM, stylesHook.textHeader]}>{m}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={decreaseM} disabled={m === 2} style={styles.chevron}>
              <Icon name="chevron-down" size={22} type="font-awesome-5" color={m === 2 ? colors.buttonDisabledTextColor : '#007AFF'} />
            </TouchableOpacity>
          </View>

          <View style={styles.columnOf}>
            <Text style={styles.textOf}>{loc.multisig.of}</Text>
          </View>

          <View style={styles.column}>
            <TouchableOpacity accessibilityRole="button" disabled={n === 7} onPress={increaseN} style={styles.chevron}>
              <Icon name="chevron-up" size={22} type="font-awesome-5" color={n === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
            </TouchableOpacity>
            <Text style={[styles.textM, stylesHook.textHeader]}>{n}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={decreaseN} disabled={n === m} style={styles.chevron} testID="DecreaseN">
              <Icon name="chevron-down" size={22} type="font-awesome-5" color={n === m ? colors.buttonDisabledTextColor : '#007AFF'} />
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

  const showAdvancedOptionsModal = () => {
    bottomModalRef.current?.present();
  };

  const getCurrentlySelectedFormat = (code: string) => {
    switch (code) {
      case 'format':
        return getCurrentFormatReadable(format);
      case 'quorum':
        return loc.formatString(loc.multisig.quorum, { m, n });
      default:
        throw new Error('This should never happen');
    }
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
      <View>
        <ListItem
          testID="VaultAdvancedCustomize"
          onPress={showAdvancedOptionsModal}
          title={loc.multisig.vault_advanced_customize}
          subtitle={`${getCurrentlySelectedFormat('format')}, ${getCurrentlySelectedFormat('quorum')}`}
          chevron
        />
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

const getCurrentFormatReadable = (f: string) => {
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

export default WalletsAddMultisig;
