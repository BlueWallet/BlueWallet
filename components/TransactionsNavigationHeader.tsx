import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from './themes';
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

/** Default hero body min height before the 20% increase (see HERO_MIN_BODY_HEIGHT). */
const HERO_BASE_BODY_MIN_HEIGHT = 120;
const HERO_MIN_BODY_HEIGHT = Math.round(HERO_BASE_BODY_MIN_HEIGHT * 1.2);
const HERO_BOTTOM_PADDING = 32;
const WALLET_LABEL_TOP_GAP = 32;

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  unit: BitcoinUnit;
  /** Top inset (safe area + nav bar) so content clears the transparent header. */
  headerOverlayHeight: number;
  onWalletUnitChange: (unit: BitcoinUnit) => void;
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (shouldHideBalance: boolean) => void;
  unitSwitching?: boolean;
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  wallet,
  headerOverlayHeight,
  onWalletUnitChange,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
  unit = BitcoinUnit.BTC,
  unitSwitching = false,
}) => {
  const { colors } = useTheme();
  const { hideBalance } = wallet;
  const isLightningWallet = wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type;
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(isLightningWallet);
  const { preferredFiatCurrency } = useSettings();
  const { direction } = useLocale();

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
  }, [hideBalance, onWalletBalanceVisibilityChange]);

  const changeWalletBalanceUnit = () => {
    if (hideBalance) {
      return;
    }
    let newWalletPreferredUnit = wallet.getPreferredBalanceUnit();

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
      if (id === actionKeys.WalletBalanceVisibility) {
        handleBalanceVisibility();
      } else if (id === actionKeys.CopyToClipboard) {
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

  const toolTipWalletBalanceActions = useMemo(() => {
    return hideBalance
      ? [
          {
            id: actionKeys.WalletBalanceVisibility,
            text: loc.transactions.details_balance_show,
            icon: actionIcons.Eye,
          },
        ]
      : [
          {
            id: actionKeys.WalletBalanceVisibility,
            text: loc.transactions.details_balance_hide,
            icon: actionIcons.EyeSlash,
          },
          {
            id: actionKeys.CopyToClipboard,
            text: loc.transactions.details_copy,
            icon: actionIcons.Clipboard,
          },
        ];
  }, [hideBalance]);

  return (
    <View
      style={[
        styles.lineaderGradient,
        {
          paddingTop: headerOverlayHeight,
          minHeight: headerOverlayHeight + HERO_MIN_BODY_HEIGHT,
          backgroundColor: WalletGradient.headerColorFor(wallet.type),
        },
      ]}
    >
      <LinearGradient colors={WalletGradient.gradientsFor(wallet.type)} style={StyleSheet.absoluteFill} />
      <View style={styles.contentContainer}>
        <Text testID="WalletLabel" numberOfLines={1} style={[styles.walletLabel, { writingDirection: direction }]}>
          {wallet.getLabel()}
        </Text>
        <View style={styles.balanceSection}>
          <View style={styles.walletBalanceAndUnitContainer}>
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
                  <Text
                    testID="WalletBalance"
                    numberOfLines={1}
                    minimumFontScale={0.5}
                    adjustsFontSizeToFit
                    style={styles.walletBalanceText}
                  >
                    {balance}
                  </Text>
                )}
              </View>
            </ToolTipMenu>
            {!hideBalance && (
              <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit} disabled={unitSwitching}>
                <Text style={styles.walletPreferredUnitText}>
                  {unit === BitcoinUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {(wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) && allowOnchainAddress && (
            <View style={styles.manageFundsSection}>
              <ToolTipMenu
                shouldOpenOnLongPress={false}
                isButton
                enableAndroidRipple={false}
                onPressMenuItem={handleManageFundsPressed}
                actions={toolTipActions}
                buttonStyle={styles.manageFundsButton}
              >
                <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
              </ToolTipMenu>
            </View>
          )}
        </View>
        {wallet.type === MultisigHDWallet.type && (
          <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={() => handleManageFundsPressed()}>
            <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.bottomBarSpacer}>
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              ...Platform.select({
                ios: { shadowColor: colors.shadowColor },
                android: {},
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lineaderGradient: {
    justifyContent: 'flex-start',
    position: 'relative',
  },
  contentContainer: {
    paddingTop: WALLET_LABEL_TOP_GAP,
    paddingHorizontal: 16,
    paddingBottom: HERO_BOTTOM_PADDING,
  },
  bottomBarSpacer: {
    position: 'relative',
    height: 12,
    marginBottom: -1,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  balanceSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  walletBalance: {
    flexShrink: 1,
    marginRight: 6,
    minHeight: 39,
    justifyContent: 'center',
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
  manageFundsSection: {
    width: '100%',
    alignItems: 'flex-start',
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
    paddingRight: 10,
  },
  walletBalanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 36,
    flexShrink: 1,
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
