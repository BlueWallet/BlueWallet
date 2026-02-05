import React, { useReducer, useCallback } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { MultisigHDWallet } from '../../class';
import Button from '../../components/Button';
import ListItem from '../../components/ListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { resetScanWasBBQR } from '../../helpers/scan-qr.ts';

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisig'>;
type RouteProps = RouteProp<AddWalletStackParamList, 'WalletsAddMultisig'>;

enum MultisigActions {
  SET_M = 'SET_M',
  SET_N = 'SET_N',
  SET_FORMAT = 'SET_FORMAT',
}

interface MultisigState {
  m: number;
  n: number;
  format: string;
}

type MultisigAction =
  | { type: MultisigActions.SET_M; payload: number }
  | { type: MultisigActions.SET_N; payload: number }
  | { type: MultisigActions.SET_FORMAT; payload: string };

const multisigReducer = (state: MultisigState, action: MultisigAction): MultisigState => {
  switch (action.type) {
    case MultisigActions.SET_M:
      return { ...state, m: action.payload };
    case MultisigActions.SET_N:
      return { ...state, n: action.payload };
    case MultisigActions.SET_FORMAT:
      return { ...state, format: action.payload };
    default:
      return state;
  }
};

const WalletsAddMultisig: React.FC = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation<NavigationProps>();
  const { walletLabel } = useRoute<RouteProps>().params;

  const [state, dispatch] = useReducer(multisigReducer, {
    m: 2,
    n: 3,
    format: MultisigHDWallet.FORMAT_P2WSH,
  });

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
  });

  const onLetsStartPress = useCallback(() => {
    resetScanWasBBQR();
    navigate('WalletsAddMultisigStep2', { m: state.m, n: state.n, format: state.format, walletLabel });
  }, [navigate, state.m, state.n, state.format, walletLabel]);

  const showAdvancedOptionsModal = useCallback(() => {
    navigate('MultisigAdvanced', {
      m: state.m,
      n: state.n,
      format: state.format,
      onSave: (m: number, n: number, format: string) => {
        dispatch({ type: MultisigActions.SET_M, payload: m });
        dispatch({ type: MultisigActions.SET_N, payload: n });
        dispatch({ type: MultisigActions.SET_FORMAT, payload: format });
      },
    });
  }, [navigate, state.m, state.n, state.format]);

  const getCurrentlySelectedFormat = (code: string) => {
    switch (code) {
      case 'format':
        return getCurrentFormatReadable(state.format);
      case 'quorum':
        return loc.formatString(loc.multisig.quorum, { m: state.m, n: state.n });
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
            {loc.formatString(loc.multisig.what_is_vault_numberOfWallets, { m: state.m, n: state.n })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>{loc.multisig.what_is_vault_wallet}</Text>
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.multisig.needs}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {loc.formatString(loc.multisig.what_is_vault_description_number_of_vault_keys, { m: state.m })}
          </Text>
          <Text style={[styles.textdesc, stylesHook.textdesc]}>
            {state.m === 2 && state.n === 3
              ? loc.multisig.what_is_vault_description_to_spend
              : loc.multisig.what_is_vault_description_to_spend_other}
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
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  descriptionContainer: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  buttonContainer: {
    padding: 24,
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
  lottie: {
    width: 233,
    height: 176,
  },
  imageWrapper: {
    borderWidth: 0,
    alignItems: 'center',
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
