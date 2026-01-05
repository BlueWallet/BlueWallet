import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { StyleSheet, Text, View } from 'react-native';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import confirm from '../../helpers/confirm';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import presentAlert from '../Alert';
import QRCodeComponent from '../QRCodeComponent';
import { useTheme } from '../themes';
import { AddressTypeBadge } from './AddressTypeBadge';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useStorage } from '../../hooks/context/useStorage';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import HighlightedText from '../HighlightedText';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface AddressItemProps {
  item: any;
  balanceUnit: BitcoinUnit;
  walletID: string;
  allowSignVerifyMessage: boolean;
  onPress?: () => void; // example: ManageWallets uses this
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const AddressItem = ({
  item,
  balanceUnit,
  walletID,
  allowSignVerifyMessage,
  onPress,
  searchQuery = '',
  renderHighlightedText,
}: AddressItemProps) => {
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);
  const previousBalance = useRef<string | undefined>(undefined);

  const hasTransactions = item.transactions > 0;

  const stylesHook = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },

    index: {
      color: colors.alternativeTextColor,
    },
    balance: {
      color: colors.alternativeTextColor,
    },
    address: {
      color: hasTransactions ? colors.darkGray : colors.buttonTextColor,
    },
  });

  const { navigate } = useExtendedNavigation<NavigationProps>();

  const navigateToReceive = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigate('ReceiveDetails', {
        walletID,
        address: item.address,
      });
    }
  }, [navigate, walletID, item.address, onPress]);

  const navigateToSignVerify = useCallback(() => {
    navigate('SignVerifyRoot', {
      screen: 'SignVerify',
      params: {
        walletID,
        address: item.address,
      },
    });
  }, [navigate, walletID, item.address]);

  const menuActions = useMemo(
    () => [
      CommonToolTipActions.CopyTXID,
      CommonToolTipActions.Share,
      {
        ...CommonToolTipActions.SignVerify,
        hidden: !allowSignVerifyMessage,
      },
      {
        ...CommonToolTipActions.ExportPrivateKey,
        hidden: !allowSignVerifyMessage,
      },
    ],
    [allowSignVerifyMessage],
  );

  const balance = formatBalance(item.balance, balanceUnit, true);

  useEffect(() => {
    if (previousBalance.current !== undefined && previousBalance.current !== balance) {
      balanceOpacity.value = 0;
      balanceTranslateY.value = 6;
      balanceOpacity.value = withTiming(1, { duration: 180 });
      balanceTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    }

    previousBalance.current = balance;
  }, [balance, balanceOpacity, balanceTranslateY]);

  const animatedBalanceStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
    transform: [{ translateY: balanceTranslateY.value }],
  }));

  const handleCopyPress = useCallback(() => {
    Clipboard.setString(item.address);
  }, [item.address]);

  const handleSharePress = useCallback(() => {
    Share.open({ message: item.address }).catch(error => console.log(error));
  }, [item.address]);

  const handleCopyPrivkeyPress = useCallback(() => {
    const wallet = wallets.find(w => w.getID() === walletID);
    if (!wallet) {
      presentAlert({ message: 'Internal error: cant find wallet' });
      return;
    }

    try {
      const wif = wallet._getWIFbyAddress(item.address);
      if (!wif) {
        presentAlert({ message: 'Internal error: cant get WIF from the wallet' });
        return;
      }
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      Clipboard.setString(wif);
    } catch (error: any) {
      presentAlert({ message: error.message });
    }
  }, [wallets, walletID, item.address]);

  const onToolTipPress = useCallback(
    async (id: string) => {
      if (id === CommonToolTipActions.CopyTXID.id) {
        handleCopyPress();
      } else if (id === CommonToolTipActions.Share.id) {
        handleSharePress();
      } else if (id === CommonToolTipActions.SignVerify.id) {
        navigateToSignVerify();
      } else if (id === CommonToolTipActions.ExportPrivateKey.id) {
        if (await confirm(loc.addresses.sensitive_private_key)) {
          if (await isBiometricUseCapableAndEnabled()) {
            if (!(await unlockWithBiometrics())) {
              return;
            }
          }
          handleCopyPrivkeyPress();
        }
      }
    },
    [handleCopyPress, handleSharePress, navigateToSignVerify, handleCopyPrivkeyPress, isBiometricUseCapableAndEnabled],
  );

  const renderPreview = useCallback(() => <QRCodeComponent value={item.address} isMenuAvailable={false} />, [item.address]);

  // Render address with highlighting if a search query is provided
  const renderAddressContent = () => {
    if (searchQuery && searchQuery.length > 0) {
      if (renderHighlightedText) {
        return renderHighlightedText(item.address, searchQuery);
      }
      return (
        <HighlightedText
          text={item.address}
          query={searchQuery}
          caseSensitive={false}
          highlightOnlyFirstMatch={searchQuery.length === 1}
          style={[stylesHook.address, styles.address]}
        />
      );
    }

    return (
      <Text style={[stylesHook.address, styles.address]} numberOfLines={1} ellipsizeMode="middle">
        {item.address}
      </Text>
    );
  };

  return (
    <ToolTipMenu
      title={item.address}
      actions={menuActions}
      onPressMenuItem={onToolTipPress}
      // Revisit once RNMenu has renderPreview prop
      renderPreview={renderPreview}
      onPress={navigateToReceive}
      isButton
      buttonStyle={styles.tooltipButton}
      shouldOpenOnLongPress
    >
      <View key={item.key} style={[stylesHook.container, styles.itemContainer, styles.itemWrapper]}>
        <View style={styles.mainSection}>
          <View style={styles.leftSection}>
            <Text style={[styles.index, stylesHook.index]}>{item.index}</Text>
          </View>
          <View style={styles.middleSection}>
            {renderAddressContent()}
            <Animated.Text style={[stylesHook.balance, styles.balance, animatedBalanceStyle]}>{balance}</Animated.Text>
          </View>
        </View>
        <View style={styles.rightContainer}>
          <AddressTypeBadge isInternal={item.isInternal} hasTransactions={hasTransactions} />
          <Text style={[stylesHook.balance, styles.balance]}>
            {loc.addresses.transactions}: {item.transactions ?? 0}
          </Text>
        </View>
      </View>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  address: {
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  itemContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tooltipButton: {
    width: '100%',
    alignSelf: 'stretch',
  },
  index: {
    fontSize: 15,
    fontWeight: '600',
  },
  balance: {
    marginTop: 6,
    fontWeight: '600',
  },
  mainSection: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSection: {
    marginRight: 10,
    paddingTop: 2,
  },
  middleSection: {
    flex: 1,
    paddingRight: 12,
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 96,
    paddingLeft: 8,
  },
});

export { AddressItem };
