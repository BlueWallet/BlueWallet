import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useLocale } from '@react-navigation/native';
import AnimatedBalance from './AnimatedBalance';

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
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();
  const { direction } = useLocale();
  const insets = useSafeAreaInsets();

  const headerInnerStyle = useMemo(
    () => [
      styles.headerInner,
      {
        paddingLeft: 15 + insets.left,
        paddingRight: 15 + insets.right,
      },
    ],
    [insets.left, insets.right],
  );

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) {
      wallet
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch(() => {
          console.error('This LNDhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [wallet]);

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
    return formatBalanceWithoutSuffix(currentBalance, unit, true);
  }, [unit, currentBalance]);

  const balance = !wallet.hideBalance && formattedBalance;

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

  return (
    <LinearGradient colors={WalletGradient.gradientsFor(wallet.type)} style={styles.lineaderGradient}>
      <View style={headerInnerStyle}>
        <View style={styles.titleBlock}>
          <Text testID="WalletLabel" numberOfLines={1} style={[styles.walletLabel, { writingDirection: direction }]}>
            {wallet.getLabel()}
          </Text>
        </View>

        <View style={styles.balanceDock} collapsable={false}>
          <View style={styles.balanceDockInner}>
            <View style={styles.balanceMenuSlot}>
              <ToolTipMenu
                shouldOpenOnLongPress
                isButton={false}
                enableAndroidRipple={false}
                style={styles.balanceMenuTrigger}
                onPressMenuItem={onPressMenuItem}
                actions={toolTipWalletBalanceActions}
              >
                <View style={styles.balanceMenuContent}>
                  {hideBalance ? (
                    <BlurredBalanceView />
                  ) : (
                    <View testID="WalletBalance" accessible accessibilityLabel={String(balance)} style={styles.balanceNumberHost}>
                      <AnimatedBalance
                        formattedValue={String(balance)}
                        textStyle={styles.walletBalanceText}
                        variant="prominent"
                        autoFitText={false}
                      />
                    </View>
                  )}
                </View>
              </ToolTipMenu>
            </View>
            <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit} disabled={unitSwitching}>
              <Text style={styles.walletPreferredUnitText}>
                {unit === BitcoinUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {(wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) && allowOnchainAddress && (
          <ToolTipMenu
            shouldOpenOnLongPress
            isButton
            onPressMenuItem={handleManageFundsPressed}
            actions={toolTipActions}
            buttonStyle={styles.manageFundsButton}
          >
            <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
          </ToolTipMenu>
        )}
        {wallet.type === MultisigHDWallet.type && (
          <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={() => handleManageFundsPressed()}>
            <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
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
  headerInner: {
    paddingVertical: 15,
  },
  titleBlock: {
    alignSelf: 'stretch',
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 19,
    lineHeight: 24,
    color: '#fff',
  },
  balanceDock: {
    alignSelf: 'stretch',
    marginTop: 6,
    overflow: 'hidden',
  },
  balanceDockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  balanceMenuSlot: {
    marginRight: 6,
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  balanceMenuTrigger: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  balanceMenuContent: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  balanceNumberHost: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
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
  walletBalanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
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

export default React.memo(TransactionsNavigationHeader);
