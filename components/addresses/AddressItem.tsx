import React, { useMemo, useCallback } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { StyleSheet, Text, View } from 'react-native';
import { ListItem } from '@rneui/themed';
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

interface AddressItemProps {
  item: any;
  balanceUnit: BitcoinUnit;
  walletID: string;
  allowSignVerifyMessage: boolean;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const AddressItem = ({ item, balanceUnit, walletID, allowSignVerifyMessage }: AddressItemProps) => {
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();

  const hasTransactions = item.transactions > 0;

  const stylesHook = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    list: {
      color: colors.buttonTextColor,
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
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        walletID,
        address: item.address,
      },
    });
  }, [navigate, walletID, item.address]);

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

  return (
    <ToolTipMenu
      title={item.address}
      actions={menuActions}
      onPressMenuItem={onToolTipPress}
      renderPreview={renderPreview}
      onPress={navigateToReceive}
      isButton
    >
      <ListItem key={item.key} containerStyle={stylesHook.container}>
        <ListItem.Content style={stylesHook.list}>
          <ListItem.Title style={stylesHook.list} numberOfLines={1} ellipsizeMode="middle">
            <Text style={[styles.index, stylesHook.index]}>{item.index + 1}</Text>{' '}
            <Text style={[stylesHook.address, styles.address]}>{item.address}</Text>
          </ListItem.Title>
          <View style={styles.subtitle}>
            <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>{balance}</Text>
          </View>
        </ListItem.Content>
        <View>
          <AddressTypeBadge isInternal={item.isInternal} hasTransactions={hasTransactions} />
          <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>
            {loc.addresses.transactions}: {item.transactions}
          </Text>
        </View>
      </ListItem>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  address: {
    fontWeight: 'bold',
    marginHorizontal: 40,
  },
  index: {
    fontSize: 15,
  },
  balance: {
    marginTop: 8,
    marginLeft: 14,
  },
  subtitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});

export { AddressItem };
