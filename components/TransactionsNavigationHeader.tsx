import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { I18nManager, Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { TWallet } from '../class/wallets/types';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import { ToolTipMenuProps } from './types';
import ToolTipMenu from './TooltipMenu';

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  onWalletUnitChange?: (wallet: any) => void;
  navigation: {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
  };
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
  actionKeys: {
    CopyToClipboard: 'copyToClipboard';
    WalletBalanceVisibility: 'walletBalanceVisibility';
    Refill: 'refill';
    RefillWithExternalWallet: 'qrcode';
  };
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  wallet: initialWallet,
  onWalletUnitChange,
  navigation,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
}) => {
  const [wallet, setWallet] = useState(initialWallet);
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();

  const menuRef = useRef<ToolTipMenuProps>(null);

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (wallet.type === LightningCustodianWallet.type) {
      wallet
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch((e: Error) => {
          console.log('This Lndhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [wallet]);

  useEffect(() => {
    setWallet(initialWallet);
  }, [initialWallet]);

  useEffect(() => {
    verifyIfWalletAllowsOnchainAddress();
  }, [wallet, verifyIfWalletAllowsOnchainAddress]);

  const handleCopyPress = useCallback(() => {
    const value = formatBalance(wallet.getBalance(), wallet.getPreferredBalanceUnit());
    if (value) {
      Clipboard.setString(value);
    }
  }, [wallet]);

  const handleBalanceVisibility = useCallback(() => {
    onWalletBalanceVisibilityChange?.(!wallet.hideBalance);
  }, [onWalletBalanceVisibilityChange, wallet.hideBalance]);

  const updateWalletWithNewUnit = (w: TWallet, newPreferredUnit: BitcoinUnit) => {
    w.preferredBalanceUnit = newPreferredUnit;
    return w;
  };

  const changeWalletBalanceUnit = () => {
    if (menuRef.current?.dismissMenu) {
      menuRef.current.dismissMenu();
    }
    let newWalletPreferredUnit = wallet.getPreferredBalanceUnit();

    if (newWalletPreferredUnit === BitcoinUnit.BTC) {
      newWalletPreferredUnit = BitcoinUnit.SATS;
    } else if (newWalletPreferredUnit === BitcoinUnit.SATS) {
      newWalletPreferredUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else {
      newWalletPreferredUnit = BitcoinUnit.BTC;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updatedWallet = updateWalletWithNewUnit(wallet, newWalletPreferredUnit);
    setWallet(updatedWallet);
    onWalletUnitChange?.(updatedWallet);
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

  const balance = useMemo(() => {
    const hideBalance = wallet.hideBalance;
    const balanceUnit = wallet.getPreferredBalanceUnit();
    const balanceFormatted =
      balanceUnit === BitcoinUnit.LOCAL_CURRENCY
        ? formatBalance(wallet.getBalance(), balanceUnit, true)
        : formatBalanceWithoutSuffix(wallet.getBalance(), balanceUnit, true);
    return !hideBalance && balanceFormatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.hideBalance, wallet.getPreferredBalanceUnit()]);

  const toolTipWalletBalanceActions = useMemo(() => {
    return wallet.hideBalance
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
  }, [wallet.hideBalance]);

  const imageSource = useMemo(() => {
    switch (wallet.type) {
      case LightningCustodianWallet.type:
        return I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
      case MultisigHDWallet.type:
        return I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      default:
        return I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
    }
  }, [wallet.type]);

  return (
    <LinearGradient
      colors={WalletGradient.gradientsFor(wallet.type)}
      style={styles.lineaderGradient}
      {...WalletGradient.linearGradientProps(wallet.type)}
    >
      <Image source={imageSource} defaultSource={imageSource} style={styles.chainIcon} />

      <Text testID="WalletLabel" numberOfLines={1} style={styles.walletLabel} selectable>
        {wallet.getLabel()}
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
            {wallet.hideBalance ? (
              <BlurredBalanceView />
            ) : (
              <View>
                <Text
                  testID="WalletBalance"
                  // @ts-ignore: Ugh
                  key={balance} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                  numberOfLines={1}
                  minimumFontScale={0.5}
                  adjustsFontSizeToFit
                  style={styles.walletBalanceText}
                >
                  {balance}
                </Text>
              </View>
            )}
          </View>
        </ToolTipMenu>
        <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit}>
          <Text style={styles.walletPreferredUnitText}>
            {wallet.getPreferredBalanceUnit() === BitcoinUnit.LOCAL_CURRENCY
              ? preferredFiatCurrency?.endPointKey ?? FiatUnit.USD
              : wallet.getPreferredBalanceUnit()}
          </Text>
        </TouchableOpacity>
      </View>
      {wallet.type === LightningCustodianWallet.type && allowOnchainAddress && (
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
      {wallet.type === MultisigHDWallet.type && (
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
