import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
import { AddressTypeBadge } from './AddressTypeBadge';
import loc, { formatBalance } from '../../loc';
import TooltipMenu from '../TooltipMenu';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';

const AddressItem = ({ item, balanceUnit, walletID, allowSignVerifyMessage }) => {
  const { colors } = useTheme();

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

  const { navigate } = useNavigation();

  const navigateToReceive = () => {
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        walletID,
        address: item.address,
      },
    });
  };

  const navigateToSignVerify = () => {
    navigate('SignVerifyRoot', {
      screen: 'SignVerify',
      params: {
        walletID,
        address: item.address,
      },
    });
  };

  const balance = formatBalance(item.balance, balanceUnit, true);

  const handleCopyPress = () => {
    Clipboard.setString(item.address);
  };

  const handleSharePress = () => {
    Share.open({ message: item.address }).catch(error => console.log(error));
  };

  const onToolTipPress = id => {
    if (id === 'copyToClipboard') {
      handleCopyPress();
    } else if (id === 'share') {
      handleSharePress();
    } else if (id === 'signVerify') {
      navigateToSignVerify();
    }
  };

  const getAvailableActions = () => {
    const actions = [
      {
        id: 'copyToClipboard',
        text: loc.transactions.details_copy,
        icon: {
          iconType: 'SYSTEM',
          iconValue: 'arrow.right.doc.on.clipboard',
        },
      },
      {
        id: 'share',
        text: loc.receive.details_share,
        icon: {
          iconType: 'SYSTEM',
          iconValue: 'square.and.arrow.up',
        },
      },
    ];

    if (allowSignVerifyMessage) {
      actions.push({
        id: 'signVerify',
        text: loc.addresses.sign_title,
        icon: {
          iconType: 'SYSTEM',
          iconValue: 'signature',
        },
      });
    }

    return actions;
  };

  const render = () => {
    return (
      <TooltipMenu actions={getAvailableActions()} onPress={onToolTipPress}>
        <ListItem key={`${item.key}`} button onPress={navigateToReceive} containerStyle={stylesHook.container}>
          <ListItem.Content style={stylesHook.list}>
            <ListItem.Title style={stylesHook.list} numberOfLines={1} ellipsizeMode="middle">
              <Text style={[styles.index, stylesHook.index]}>{item.index + 1}</Text>{' '}
              <Text style={[stylesHook.address, styles.address]}>{item.address}</Text>
            </ListItem.Title>
            <View style={styles.subtitle}>
              <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>{balance}</Text>
            </View>
          </ListItem.Content>
          <View style={styles.labels}>
            <AddressTypeBadge isInternal={item.isInternal} hasTransactions={hasTransactions} />
            <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>
              {loc.addresses.transactions}: {item.transactions}
            </Text>
          </View>
        </ListItem>
      </TooltipMenu>
    );
  };

  return render();
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

AddressItem.propTypes = {
  item: PropTypes.shape({
    key: PropTypes.string,
    index: PropTypes.number,
    address: PropTypes.string,
    isInternal: PropTypes.bool,
    transactions: PropTypes.number,
    balance: PropTypes.number,
  }),
  balanceUnit: PropTypes.string,
};
export { AddressItem };
