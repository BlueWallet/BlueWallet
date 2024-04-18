import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image, Text, TouchableOpacity, View, I18nManager, StyleSheet, LayoutAnimation } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import { HDSegwitBech32Wallet, LightningCustodianWallet, LightningLdkWallet, MultisigHDWallet } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
import WalletGradient from '../class/wallet-gradient';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import ToolTipMenu from './TooltipMenu';
import { FiatUnit } from '../models/fiatUnit';
import { TWallet } from '../class/wallets/types';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from './Context/SettingsContext';

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  onWalletUnitChange?: (wallet: any) => void;
  navigation: {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
  };
  onManageFundsPressed?: (id: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
  actionKeys: {
    CopyToClipboard: 'copyToClipboard';
    WalletBalanceVisibility: 'walletBalanceVisibility';
    Refill: 'refill';
    RefillWithExternalWallet: 'qrcode';
  };
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  // @ts-ignore: Ugh
  wallet: initialWallet,
  // @ts-ignore: Ugh
  onWalletUnitChange,
  // @ts-ignore: Ugh
  navigation,
  // @ts-ignore: Ugh
  onManageFundsPressed,
  // @ts-ignore: Ugh
  onWalletBalanceVisibilityChange,
}) => {
  const [wallet, setWallet] = useState(initialWallet);
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();

  const menuRef = useRef(null);

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

  const handleCopyPress = () => {
    const value = formatBalance(wallet.getBalance(), wallet.getPreferredBalanceUnit());
    if (value) {
      Clipboard.setString(value);
    }
  };

  const handleBalanceVisibility = () => {
    onWalletBalanceVisibilityChange?.(!wallet.hideBalance);
  };

  const updateWalletWithNewUnit = (w: TWallet, newPreferredUnit: BitcoinUnit) => {
    w.preferredBalanceUnit = newPreferredUnit;
    return w;
  };

  const changeWalletBalanceUnit = () => {
    // @ts-ignore: Ugh
    menuRef.current?.dismissMenu();
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

  const handleManageFundsPressed = () => {
    onManageFundsPressed?.(actionKeys.Refill);
  };

  const handleOnPaymentCodeButtonPressed = () => {
    navigation.navigate('PaymentCodeRoot', {
      screen: 'PaymentCode',
      params: { paymentCode: (wallet as HDSegwitBech32Wallet).getBIP47PaymentCode() },
    });
  };

  const onPressMenuItem = (id: string) => {
    if (id === 'walletBalanceVisibility') {
      handleBalanceVisibility();
    } else if (id === 'copyToClipboard') {
      handleCopyPress();
    }
  };

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

  return (
    <LinearGradient
      colors={WalletGradient.gradientsFor(wallet.type)}
      style={styles.lineaderGradient}
      // @ts-ignore: Ugh
      {...WalletGradient.linearGradientProps(wallet.type)}
    >
      <Image
        source={(() => {
          switch (wallet.type) {
            case LightningLdkWallet.type:
            case LightningCustodianWallet.type:
              return I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
            case MultisigHDWallet.type:
              return I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
            default:
              return I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
          }
        })()}
        style={styles.chainIcon}
      />

      <Text testID="WalletLabel" numberOfLines={1} style={styles.walletLabel} selectable>
        {wallet.getLabel()}
      </Text>
      <View style={styles.walletBalanceAndUnitContainer}>
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          enableAndroidRipple={false}
          ref={menuRef}
          buttonStyle={styles.walletBalance}
          onPressMenuItem={onPressMenuItem}
          actions={
            wallet.hideBalance
              ? [
                  {
                    id: 'walletBalanceVisibility',
                    text: loc.transactions.details_balance_show,
                    icon: {
                      iconType: 'SYSTEM',
                      iconValue: 'eye',
                    },
                  },
                ]
              : [
                  {
                    id: 'walletBalanceVisibility',
                    text: loc.transactions.details_balance_hide,
                    icon: {
                      iconType: 'SYSTEM',
                      iconValue: 'eye.slash',
                    },
                  },
                  {
                    id: 'copyToClipboard',
                    text: loc.transactions.details_copy,
                    icon: {
                      iconType: 'SYSTEM',
                      iconValue: 'doc.on.doc',
                    },
                  },
                ]
          }
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
          actions={[
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
          ]}
          buttonStyle={styles.manageFundsButton}
        >
          <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
        </ToolTipMenu>
      )}

      {wallet.allowBIP47() && wallet.isBIP47Enabled() && (
        <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={handleOnPaymentCodeButtonPressed}>
          <Text style={styles.manageFundsButtonText}>{loc.bip47.payment_code}</Text>
        </TouchableOpacity>
      )}
      {wallet.type === LightningLdkWallet.type && (
        <TouchableOpacity
          style={styles.manageFundsButton}
          accessibilityRole="button"
          accessibilityLabel={loc.lnd.title}
          onPress={handleManageFundsPressed}
        >
          <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
        </TouchableOpacity>
      )}
      {wallet.type === MultisigHDWallet.type && (
        <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={handleManageFundsPressed}>
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
    height: 34,
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
    paddingVertical: 5,
    minHeight: 35,
    minWidth: 65,
    padding: 10, // Adjust padding as needed to fit the content
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
  RefillWithExternalWallet: 'qrcode',
};

export const actionIcons = {
  Eye: {
    iconType: 'SYSTEM',
    iconValue: 'eye',
  },
  EyeSlash: {
    iconType: 'SYSTEM',
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
  Refill: {
    iconType: 'SYSTEM',
    iconValue: 'goforward.plus',
  },
  RefillWithExternalWallet: {
    iconType: 'SYSTEM',
    iconValue: 'qrcode',
  },
};

export default TransactionsNavigationHeader;
