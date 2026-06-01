import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import WalletGradient from '../class/wallet-gradient';
import { TWallet } from '../class/wallets/types';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import ToolTipMenu from './TooltipMenu';
import useAnimateOnChange from '../hooks/useAnimateOnChange';
import { useLocale } from '@react-navigation/native';

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  unit: BitcoinUnit;
  onWalletUnitChange: (unit: BitcoinUnit) => void;
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
  unitSwitching?: boolean;
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  wallet,
  onWalletUnitChange,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
  unit = BitcoinUnit.BTC,
  unitSwitching = false,
}) => {
  const { hideBalance } = wallet;
  const isLightningWallet = wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type;
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(isLightningWallet);
  const { preferredFiatCurrency } = useSettings();
  const { direction } = useLocale();
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);
  const previousBalance = useRef<string | undefined>(undefined);

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (isLightningWallet) {
      wallet
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch(() => {
          console.error('This LNDhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [isLightningWallet, wallet]);

  useEffect(() => {
    setAllowOnchainAddress(isLightningWallet);
  }, [isLightningWallet]);

  useEffect(() => {
    verifyIfWalletAllowsOnchainAddress();
  }, [wallet, verifyIfWalletAllowsOnchainAddress]);

  const handleCopyPress = useCallback(() => {
    const value = formatBalance(wallet.getBalance(), unit);
    if (value) {
      Clipboard.setString(value);
    }
  }, [unit, wallet]);

  const handleBalanceVisibility = useCallback(() => {
    onWalletBalanceVisibilityChange?.(!hideBalance);
  }, [onWalletBalanceVisibilityChange, hideBalance]);

  const changeWalletBalanceUnit = () => {
    let newWalletPreferredUnit = wallet.getPreferredBalanceUnit();

    console.debug('[UnitSwitch/UI] tap unit change', { walletID: wallet.getID?.(), current: newWalletPreferredUnit });

    if (newWalletPreferredUnit === BitcoinUnit.BTC) {
      newWalletPreferredUnit = BitcoinUnit.SATS;
    } else if (newWalletPreferredUnit === BitcoinUnit.SATS) {
      newWalletPreferredUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else {
      newWalletPreferredUnit = BitcoinUnit.BTC;
    }

    console.debug('[UnitSwitch/UI] next unit resolved', { walletID: wallet.getID?.(), next: newWalletPreferredUnit });
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

  const currentBalance = wallet ? wallet.getBalance() : 0;
  const formattedBalance = useMemo(() => {
    return unit === BitcoinUnit.LOCAL_CURRENCY
      ? formatBalance(currentBalance, unit, true)
      : formatBalanceWithoutSuffix(currentBalance, unit, true);
  }, [unit, currentBalance]);

  const balance = !wallet.hideBalance && formattedBalance;
  const safeBalance = balance ? String(balance) : undefined;

  useEffect(() => {
    if (hideBalance) {
      previousBalance.current = undefined;
      balanceOpacity.value = 1;
      balanceTranslateY.value = 0;
      return;
    }

    if (previousBalance.current !== undefined && previousBalance.current !== safeBalance) {
      balanceOpacity.value = 0;
      balanceTranslateY.value = 6;
      balanceOpacity.value = withTiming(1, { duration: 180 });
      balanceTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    }

    previousBalance.current = safeBalance;
  }, [safeBalance, hideBalance, balanceOpacity, balanceTranslateY]);

  const balanceAnimationKey = useMemo(
    () => `${wallet.getID?.() ?? ''}-${unit}-${hideBalance}-${safeBalance ?? ''}`,
    [safeBalance, hideBalance, unit, wallet],
  );
  const balanceAnimatedStyle = useAnimateOnChange(balanceAnimationKey);

  const animatedBalanceTextStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
    transform: [{ translateY: balanceTranslateY.value }],
  }));

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

  useEffect(() => {
    console.debug('[UnitSwitch/UI] render state', {
      walletID: wallet.getID?.(),
      unit,
      hideBalance,
      preferredFiat: preferredFiatCurrency?.endPointKey,
      switching: unitSwitching,
    });
  }, [wallet, unit, hideBalance, preferredFiatCurrency, unitSwitching]);

  return (
    <LinearGradient colors={WalletGradient.gradientsFor(wallet.type)} style={styles.lineaderGradient}>
      <View style={styles.contentContainer}>
        <Text testID="WalletLabel" numberOfLines={1} style={[styles.walletLabel, { writingDirection: direction }]}>
          {wallet.getLabel()}
        </Text>
        <View style={styles.balanceSection}>
          <Animated.View style={[styles.walletBalanceAndUnitContainer, balanceAnimatedStyle]}>
            <ToolTipMenu
              shouldOpenOnLongPress
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
                  <View key={`wallet-balance-textwrap-${wallet.getID?.() ?? ''}-${String(balance)}`}>
                    <Animated.Text
                      key={`wallet-balance-text-${wallet.getID?.() ?? ''}-${String(balance)}`} // force recreation on balance change for RTL correctness
                      testID="WalletBalance"
                      numberOfLines={1}
                      minimumFontScale={0.5}
                      adjustsFontSizeToFit
                      style={[styles.walletBalanceText, animatedBalanceTextStyle]}
                    >
                      {balance}
                    </Animated.Text>
                  </View>
                )}
              </View>
            </ToolTipMenu>
            <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit} disabled={unitSwitching}>
              <Text style={styles.walletPreferredUnitText}>
                {unit === BitcoinUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          {(wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) && allowOnchainAddress && (
            <View style={styles.manageFundsSection}>
              <View style={styles.manageFundsButtonContainer}>
                <ToolTipMenu
                  shouldOpenOnLongPress={false}
                  isButton
                  onPressMenuItem={handleManageFundsPressed}
                  actions={toolTipActions}
                  buttonStyle={styles.manageFundsButtonTouchable}
                >
                  <View style={styles.manageFundsButtonContent}>
                    <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
                  </View>
                </ToolTipMenu>
              </View>
            </View>
          )}
        </View>
        {wallet.type === MultisigHDWallet.type && (
          <TouchableOpacity
            style={[styles.manageFundsButtonContainer, styles.manageFundsButtonTouchable]}
            accessibilityRole="button"
            onPress={() => handleManageFundsPressed()}
          >
            <View style={styles.manageFundsButtonContent}>
              <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  lineaderGradient: {
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  contentContainer: {
    padding: 15,
  },
  balanceSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
    marginBottom: 10,
  },
  walletBalance: {
    flexShrink: 1,
    marginRight: 6,
  },
  manageFundsButtonContainer: {
    marginTop: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  manageFundsButtonTouchable: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9,
    height: 39,
    paddingHorizontal: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFundsButtonContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFundsSection: {
    width: '100%',
    alignItems: 'flex-start',
  },
  manageFundsButtonText: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    padding: 0,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
