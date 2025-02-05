import React, { useCallback, useMemo } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { I18nManager, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import ToolTipMenu from './TooltipMenu';
import useAnimateOnChange from '../hooks/useAnimateOnChange';

interface TransactionsNavigationHeaderProps {
  hideBalance: boolean;
  type: string;
  label: string;
  allowOnchainAddress: boolean;
  balance: number;
  unit: BitcoinUnit;
  preferredBalanceUnit: BitcoinUnit;
  onWalletUnitChange: (unit: BitcoinUnit) => void;
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  hideBalance,
  type,
  label,
  allowOnchainAddress,
  balance,
  preferredBalanceUnit,
  onWalletUnitChange,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
  unit = BitcoinUnit.BTC,
}) => {
  const { preferredFiatCurrency } = useSettings();

  const handleCopyPress = useCallback(() => {
    const value = formatBalance(balance, unit);
    if (value) {
      Clipboard.setString(value);
    }
  }, [unit, balance]);

  const handleBalanceVisibility = useCallback(() => {
    onWalletBalanceVisibilityChange?.(!hideBalance);
  }, [onWalletBalanceVisibilityChange, hideBalance]);

  const changeWalletBalanceUnit = () => {
    let newWalletPreferredUnit = preferredBalanceUnit;

    if (newWalletPreferredUnit === BitcoinUnit.BTC) {
      newWalletPreferredUnit = BitcoinUnit.SATS;
    } else if (newWalletPreferredUnit === BitcoinUnit.SATS) {
      newWalletPreferredUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else {
      newWalletPreferredUnit = BitcoinUnit.BTC;
    }

    onWalletUnitChange(newWalletPreferredUnit);
  };

  const handleManageFundsPressed = useCallback(
    (actionKeyID?: string) => {
      if (onManageFundsPressed) {
        onManageFundsPressed(actionKeyID);
      }
    },
    [onManageFundsPressed],
  );

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id === 'walletBalanceVisibility') {
        handleBalanceVisibility();
      } else if (id === 'copyToClipboard') {
        handleCopyPress();
      }
    },
    [handleBalanceVisibility, handleCopyPress],
  );

  const toolTipActions = useMemo(() => {
    return [
      {
        id: actionKeys.Refill,
        text: loc.lnd.refill,
        icon: actionIcons.Refill,
      },
      {
        id: actionKeys.RefillWithExternalWallet,
        text: loc.lnd.refill_external,
        icon: actionIcons.RefillWithExternalWallet,
      },
    ];
  }, []);

  const balanceFormatted = useMemo(() => {
    return unit === BitcoinUnit.LOCAL_CURRENCY ? formatBalance(balance, unit, true) : formatBalanceWithoutSuffix(balance, unit, true);
  }, [unit, balance]);

  const toolTipWalletBalanceActions = useMemo(() => {
    return hideBalance
      ? [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_show,
            icon: {
              iconValue: 'eye',
            },
          },
        ]
      : [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_hide,
            icon: {
              iconValue: 'eye.slash',
            },
          },
          {
            id: 'copyToClipboard',
            text: loc.transactions.details_copy,
            icon: {
              iconValue: 'doc.on.doc',
            },
          },
        ];
  }, [hideBalance]);

  console.warn(balance);
  const imageSource = useMemo(() => {
    switch (type) {
      case LightningCustodianWallet.type:
        return I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
      case MultisigHDWallet.type:
        return I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      default:
        return I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
    }
  }, [type]);

  useAnimateOnChange(balance);
  useAnimateOnChange(hideBalance);
  useAnimateOnChange(unit);

  return (
    <LinearGradient
      colors={WalletGradient.gradientsFor(type)}
      style={styles.lineaderGradient}
      {...WalletGradient.linearGradientProps(type)}
    >
      <Image source={imageSource} style={styles.chainIcon} />

      <Text testID="WalletLabel" numberOfLines={2} style={styles.walletLabel} selectable>
        {label}
      </Text>
      <View style={styles.walletBalanceAndUnitContainer}>
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          enableAndroidRipple={false}
          buttonStyle={styles.walletBalance}
          onPressMenuItem={onPressMenuItem}
          actions={toolTipWalletBalanceActions}
        >
          <View style={styles.walletBalance}>
            {hideBalance ? (
              <BlurredBalanceView />
            ) : (
              <View>
                <Text
                  // @ts-ignore: // force component recreation on balance change. To fix right-to-left languages, like Farsis
                  key={balanceFormatted}
                  testID="WalletBalance"
                  numberOfLines={1}
                  minimumFontScale={0.5}
                  adjustsFontSizeToFit
                  style={styles.walletBalanceText}
                >
                  {balanceFormatted}
                </Text>
              </View>
            )}
          </View>
        </ToolTipMenu>
        <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit}>
          <Text style={styles.walletPreferredUnitText}>
            {unit === BitcoinUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
          </Text>
        </TouchableOpacity>
      </View>
      {type === LightningCustodianWallet.type && allowOnchainAddress && (
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          onPressMenuItem={handleManageFundsPressed}
          actions={toolTipActions}
          buttonStyle={styles.manageFundsButton}
        >
          <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
        </ToolTipMenu>
      )}
      {type === MultisigHDWallet.type && (
        <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={() => handleManageFundsPressed()}>
          <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  lineaderGradient: {
    padding: 15,
    minHeight: 140,
    justifyContent: 'center',
  },
  chainIcon: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    marginBottom: 10,
  },
  walletBalance: {
    flexShrink: 1,
    marginRight: 6,
  },
  manageFundsButton: {
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9,
    minHeight: 39,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFundsButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#FFFFFF',
    padding: 12,
  },
  walletBalanceAndUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10, // Ensure there's some padding to the right
  },
  walletBalanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 36,
    flexShrink: 1, // Allow the text to shrink if there's not enough space
  },
  walletPreferredUnitView: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    minHeight: 35,
    minWidth: 65,
  },
  walletPreferredUnitText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export const actionKeys = {
  CopyToClipboard: 'copyToClipboard',
  WalletBalanceVisibility: 'walletBalanceVisibility',
  Refill: 'refill',
  RefillWithExternalWallet: 'refillWithExternalWallet',
};

export const actionIcons = {
  Eye: {
    iconValue: 'eye',
  },
  EyeSlash: {
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconValue: 'doc.on.doc',
  },
  Refill: {
    iconValue: 'goforward.plus',
  },
  RefillWithExternalWallet: {
    iconValue: 'qrcode',
  },
};

export default TransactionsNavigationHeader;
