import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { Image, Text, TouchableOpacity, View, I18nManager, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import { AbstractWallet, LightningCustodianWallet, LightningLdkWallet, MultisigHDWallet } from '../class';
import { BitcoinUnit } from '../models/bitcoinUnits';
import WalletGradient from '../class/wallet-gradient';
import Biometric from '../class/biometrics';
import loc, { formatBalance } from '../loc';
import { BlueStorageContext } from '../blue_modules/storage-context';
import ToolTipMenu from './TooltipMenu';
import { BluePrivateBalance } from '../BlueComponents';

interface TransactionsNavigationHeaderProps {
  wallet: AbstractWallet;
  onWalletUnitChange?: (wallet: any) => void;
  navigation: {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
  };
  onManageFundsPressed?: (id: string) => void; // Add a type definition for this prop
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
}) => {
  const [wallet, setWallet] = useState(initialWallet);
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);

  const context = useContext(BlueStorageContext);
  const menuRef = useRef(null);

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (wallet.type === LightningCustodianWallet.type) {
      wallet
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch((e: any) => {
          console.log('This Lndhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [wallet]);

  useEffect(() => {
    verifyIfWalletAllowsOnchainAddress();
  }, [wallet, verifyIfWalletAllowsOnchainAddress]);

  const handleCopyPress = () => {
    Clipboard.setString(formatBalance(wallet.getBalance(), wallet.getPreferredBalanceUnit()).toString());
  };

  const updateWalletVisibility = (wallet: AbstractWallet, newHideBalance: boolean) => {
    wallet.hideBalance = newHideBalance;
    return wallet;
  };

  const handleBalanceVisibility = async () => {
    // @ts-ignore: Gotta update this class
    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled && wallet.hideBalance) {
      // @ts-ignore: Ugh
      if (!(await Biometric.unlockWithBiometrics())) {
        return navigation.goBack();
      }
    }

    const updatedWallet = updateWalletVisibility(wallet, !wallet.hideBalance);
    setWallet(updatedWallet);
    context.saveToDisk();
  };

  const updateWalletWithNewUnit = (wallet: AbstractWallet, newPreferredUnit: BitcoinUnit) => {
    wallet.preferredBalanceUnit = newPreferredUnit;
    return wallet;
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

    const updatedWallet = updateWalletWithNewUnit(wallet, newWalletPreferredUnit);
    setWallet(updatedWallet);
    onWalletUnitChange?.(updatedWallet);
  };

  const handleManageFundsPressed = () => {
    onManageFundsPressed?.(actionKeys.Refill);
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
    const balanceFormatted = formatBalance(wallet.getBalance(), balanceUnit, true).toString();
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
      <Text testID="WalletLabel" numberOfLines={1} style={styles.walletLabel}>
        {wallet.getLabel()}
      </Text>
      <ToolTipMenu
        onPress={changeWalletBalanceUnit}
        ref={menuRef}
        title={loc.wallets.balance}
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
            <BluePrivateBalance />
          ) : (
            <Text
              testID="WalletBalance"
              key={balance} // force component recreation on balance change. To fix right-to-left languages, like Farsi
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.walletBalance}
            >
              {balance}
            </Text>
          )}
        </View>
      </ToolTipMenu>
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

      {wallet.type === MultisigHDWallet.type && (
        <TouchableOpacity accessibilityRole="button" onPress={handleManageFundsPressed}>
          <View style={styles.manageFundsButton}>
            <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
          </View>
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
  },
  walletBalance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
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
