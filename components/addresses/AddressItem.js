import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
import { AddressTypeBadge } from './AddressTypeBadge';
import { formatBalance } from '../../loc';

const AddressItem = ({ item, balanceUnit, onPress }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    list: {
      color: colors.buttonTextColor,
    },
    address: {
      fontWeight: '600',
      marginHorizontal: 40,
    },
    index: {
      color: colors.alternativeTextColor,
      fontSize: 15,
    },
    balance: {
      marginTop: 8,
      marginLeft: 14,
      color: colors.alternativeTextColor,
    },
  });

  const balance = formatBalance(item.balance, balanceUnit, true);

  const render = () => {
    return (
      <ListItem key={`${item.key}`} button onPress={onPress} containerStyle={styles.container}>
        <ListItem.Content style={styles.list}>
          <ListItem.Title style={styles.list} numberOfLines={1} ellipsizeMode="middle">
            <Text style={styles.index}>{item.index}</Text> <Text style={styles.address}>{item.address}</Text>
          </ListItem.Title>
          <ListItem.Subtitle style={[styles.list, styles.balance]}>{balance}</ListItem.Subtitle>
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
