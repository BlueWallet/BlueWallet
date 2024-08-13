import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  I18nManager,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { TWallet, Transaction } from '../class/wallets/types';
import loc, { formatBalance, formatBalanceWithoutSuffix, transactionTimeToReadable } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import { useTheme } from './themes';
import { useStorage } from '../hooks/context/useStorage';
import ToolTipMenu from './TooltipMenu';
import { BlueSpacing10 } from '../BlueComponents';
import { WalletTransactionsStatus } from './Context/StorageProvider';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { ToolTipMenuProps } from './types';

type WalletViewType = 'Carousel' | 'Header' | 'Add';

interface WalletViewProps {
  type: WalletViewType;
  wallet?: TWallet;
  onPress?: (item?: TWallet) => void;
  handleLongPress?: () => void;
  isSelectedWallet?: boolean;
  customStyle?: ViewStyle;
  horizontal?: boolean;
  isActive?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
  onWalletUnitChange?: (newUnit: BitcoinUnit) => void;
  navigation?: {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
  };
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
}

const WalletView: React.FC<WalletViewProps> = ({
  type,
  wallet,
  onPress,
  handleLongPress,
  isSelectedWallet,
  customStyle,
  horizontal,
  searchQuery,
  renderHighlightedText,
  onWalletUnitChange,
  navigation,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
}) => {
  const [walletState, setWalletState] = useState(wallet);
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();
  const menuRef = useRef<ToolTipMenuProps>(null);
  const scaleValue = useRef(new Animated.Value(1.0)).current;
  const { colors } = useTheme();
  const { walletTransactionUpdateStatus } = useStorage();
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = useIsLargeScreen();

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (walletState?.type === LightningCustodianWallet.type) {
      walletState
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch(() => {
          console.log('This Lndhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [walletState]);

  useEffect(() => {
    if (wallet) {
      setWalletState(wallet);
      verifyIfWalletAllowsOnchainAddress();
    }
  }, [wallet, verifyIfWalletAllowsOnchainAddress]);

  const handleCopyPress = useCallback(() => {
    const value = walletState ? formatBalance(walletState.getBalance(), walletState.getPreferredBalanceUnit()) : null;
    if (value) {
      Clipboard.setString(value);
    }
  }, [walletState]);

  const handleBalanceVisibility = useCallback(() => {
    if (walletState) {
      onWalletBalanceVisibilityChange?.(!walletState.hideBalance);
    }
  }, [onWalletBalanceVisibilityChange, walletState]);

  const changeWalletBalanceUnit = () => {
    if (menuRef.current?.dismissMenu) {
      menuRef.current.dismissMenu();
    }
    if (walletState) {
      let newWalletPreferredUnit = walletState.getPreferredBalanceUnit();

      if (newWalletPreferredUnit === BitcoinUnit.BTC) {
        newWalletPreferredUnit = BitcoinUnit.SATS;
      } else if (newWalletPreferredUnit === BitcoinUnit.SATS) {
        newWalletPreferredUnit = BitcoinUnit.LOCAL_CURRENCY;
      } else {
        newWalletPreferredUnit = BitcoinUnit.BTC;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onWalletUnitChange?.(newWalletPreferredUnit);
    }
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
      if (id === CommonToolTipActions.WalletBalanceDisplay.id || id === CommonToolTipActions.WalletBalanceHide.id) {
        handleBalanceVisibility();
      } else if (id === CommonToolTipActions.CopyToClipboard.id) {
        handleCopyPress();
      }
    },
    [handleBalanceVisibility, handleCopyPress],
  );

  const toolTipActions = useMemo(() => {
    if (type === 'Header' && walletState) {
      return [CommonToolTipActions.Refill, CommonToolTipActions.RefillWithExternalWallet];
    }
    return [];
  }, [type, walletState]);

  const balance = useMemo(() => {
    if (!walletState) return null;
    const hideBalance = walletState.hideBalance;
    const balanceUnit = walletState.getPreferredBalanceUnit();
    const balanceFormatted =
      balanceUnit === BitcoinUnit.LOCAL_CURRENCY
        ? formatBalance(walletState.getBalance(), balanceUnit, true)
        : formatBalanceWithoutSuffix(walletState.getBalance(), balanceUnit, true);
    return !hideBalance && balanceFormatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletState?.preferredBalanceUnit, walletState?.hideBalance, walletState?.balance]);

  const toolTipWalletBalanceActions = useMemo(() => {
    if (type === 'Header' && walletState) {
      return walletState.hideBalance
        ? [CommonToolTipActions.WalletBalanceDisplay]
        : [CommonToolTipActions.WalletBalanceHide, CommonToolTipActions.CopyToClipboard];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, walletState?.hideBalance]);

  const renderHeader = () => (
    <LinearGradient
      colors={WalletGradient.gradientsFor(walletState?.type || 'default')}
      style={styles.lineaderGradient}
      {...WalletGradient.linearGradientProps(walletState?.type || 'default')}
    >
      <Image
        source={(() => {
          switch (walletState?.type) {
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
        {walletState?.getLabel()}
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
            {walletState?.hideBalance ? (
              <BlurredBalanceView />
            ) : (
              <View>
                <Text testID="WalletBalance" numberOfLines={1} minimumFontScale={0.5} adjustsFontSizeToFit style={styles.walletBalanceText}>
                  {balance}
                </Text>
              </View>
            )}
          </View>
        </ToolTipMenu>
        <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit}>
          <Text style={styles.walletPreferredUnitText}>
            {walletState?.getPreferredBalanceUnit() === BitcoinUnit.LOCAL_CURRENCY
              ? preferredFiatCurrency?.endPointKey ?? FiatUnit.USD
              : walletState?.getPreferredBalanceUnit()}
          </Text>
        </TouchableOpacity>
      </View>
      {walletState?.type === LightningCustodianWallet.type && allowOnchainAddress && (
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
      {walletState?.type === MultisigHDWallet.type && (
        <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={() => handleManageFundsPressed()}>
          <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  const renderCarouselItem = () => (
    <Animated.View
      style={[
        isLargeScreen || !horizontal ? [styles.rootLargeDevice, customStyle] : customStyle ?? { ...styles.root, width: itemWidth },
        isSelectedWallet === false ? styles.dimmed : styles.normal,
        { transform: [{ scale: scaleValue }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        testID={walletState?.getLabel()}
        onPressIn={() => {
          Animated.spring(scaleValue, {
            toValue: 0.95,
            useNativeDriver: true,
            friction: 3,
            tension: 100,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleValue, {
            toValue: 1.0,
            useNativeDriver: true,
            friction: 3,
            tension: 100,
          }).start();
        }}
        onLongPress={handleLongPress}
        onPress={() => {
          Animated.spring(scaleValue, {
            toValue: 1.0,
            useNativeDriver: true,
            friction: 3,
            tension: 100,
          }).start();
          onPress?.(walletState);
        }}
      >
        <View style={[styles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
          <LinearGradient colors={WalletGradient.gradientsFor(walletState?.type || 'default')} style={styles.grad}>
            <Image
              source={(() => {
                switch (walletState?.type) {
                  case LightningCustodianWallet.type:
                    return I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
                  case MultisigHDWallet.type:
                    return I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
                  default:
                    return I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
                }
              })()}
              style={styles.image}
            />
            <Text numberOfLines={1} style={[styles.label, { color: colors.inverseForegroundColor }]}>
              {renderHighlightedText && searchQuery
                ? renderHighlightedText(walletState?.getLabel() || '', searchQuery)
                : walletState?.getLabel()}
            </Text>
            <View style={styles.balanceContainer}>
              {walletState?.hideBalance ? (
                <>
                  <BlueSpacing10 />
                  <BlurredBalanceView />
                </>
              ) : (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  key={`${balance}`} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                  style={[styles.balance, { color: colors.inverseForegroundColor }]}
                >
                  {balance}
                </Text>
              )}
            </View>
            <View style={styles.latestTxContainer}>
              <Text numberOfLines={1} style={[styles.latestTx, { color: colors.inverseForegroundColor }]}>
                {loc.wallets.list_latest_transaction}
              </Text>
              <Text numberOfLines={1} style={[styles.latestTxTime, { color: colors.inverseForegroundColor }]}>
                {walletTransactionUpdateStatus === WalletTransactionsStatus.ALL || walletTransactionUpdateStatus === walletState?.getID()
                  ? loc.transactions.updating
                  : walletState?.getBalance() !== 0 && walletState?.getLatestTransactionTime() === 0
                    ? loc.wallets.pull_to_refresh
                    : walletState?.getTransactions().find((tx: Transaction) => tx.confirmations === 0)
                      ? loc.transactions.pending
                      : transactionTimeToReadable(walletState?.getLatestTransactionTime() || '')}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderAddItem = () => (
    <TouchableOpacity
      accessibilityRole="button"
      testID="CreateAWallet"
      onPress={() => onPress?.()}
      style={isLargeScreen ? null : { width: itemWidth * 1.2 }}
    >
      <View style={[styles.container, isLargeScreen ? null : { width: itemWidth }, { backgroundColor: colors.lightButton }]}>
        <Text style={[styles.addAWAllet, { color: colors.foregroundColor }]}>{loc.wallets.list_create_a_wallet}</Text>
        <Text style={[styles.addLine, { color: colors.alternativeTextColor }]}>{loc.wallets.list_create_a_wallet_text}</Text>
        <View style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.brandingColor }]}>{loc.wallets.list_create_a_button}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (type === 'Header') return renderHeader();
  if (type === 'Add') return renderAddItem();
  return renderCarouselItem();
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
  root: { paddingRight: 20 },
  rootLargeDevice: { marginVertical: 20 },
  grad: {
    padding: 15,
    borderRadius: 12,
    minHeight: 164,
  },
  balanceContainer: {
    height: 40,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTx: {
    backgroundColor: 'transparent',
    fontSize: 13,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxTime: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    fontSize: 16,
  },
  latestTxContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  shadowContainer: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 25 / 100,
        shadowRadius: 8,
        borderRadius: 12,
      },
      android: {
        elevation: 8,
        borderRadius: 12,
      },
    }),
  },
  container: {
    borderRadius: 10,
    minHeight: Platform.OS === 'ios' ? 164 : 181,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  addAWAllet: {
    fontWeight: '600',
    fontSize: 24,
    marginBottom: 4,
  },
  addLine: {
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '500',
  },
  dimmed: {
    opacity: 0.5,
  },
  normal: {
    opacity: 1.0,
  },
});

export default WalletView;
