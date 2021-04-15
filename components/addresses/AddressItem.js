import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ListItem } from 'react-native-elements';
import Clipboard from '@react-native-clipboard/clipboard';
import PropTypes from 'prop-types';
import { AddressTypeBadge } from './AddressTypeBadge';
import { formatBalance } from '../../loc';

const AddressItem = ({ item, balanceUnit }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    list: {
      color: colors.buttonTextColor,
    },
  });

  const copyAddressToClipboard = () => {
    Clipboard.setString(item.address);
  };

  const balance = formatBalance(item.balance, balanceUnit, true);

  const render = () => {
    return (
      <ListItem key={`${item.key}`} button onPress={copyAddressToClipboard} containerStyle={styles.container}>
        <ListItem.Content style={styles.list}>
          <ListItem.Title style={styles.list} numberOfLines={1} ellipsizeMode="middle">
            {item.index}.{item.address}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.list}>{balance}</ListItem.Subtitle>
        </ListItem.Content>
        <AddressTypeBadge isInternal={item.isInternal} />
      </ListItem>
    );
  };

  return render();
};

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
