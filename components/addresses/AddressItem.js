import React, { useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
import { AddressTypeBadge } from './AddressTypeBadge';
import loc, { formatBalance } from '../../loc';
import TooltipMenu from '../TooltipMenu';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';

const AddressItem = ({ item, balanceUnit, onPress }) => {
  const { colors } = useTheme();
  const tooltip = useRef();
  const listItem = useRef();

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

  const showToolTipMenu = () => {
    tooltip.current.showMenu();
  };

  const balance = formatBalance(item.balance, balanceUnit, true);

  const handleCopyPress = () => {
    Clipboard.setString(item.address);
  };

  const handleSharePress = () => {
    Share.open({ message: item.address }).catch(error => console.log(error));
  };

  const render = () => {
    return (
      <>
        <TooltipMenu
          ref={tooltip}
          anchorRef={listItem}
          actions={[
            {
              id: 'copyToClipboard',
              text: loc.transactions.details_copy,
              onPress: handleCopyPress,
            },
            {
              id: 'share',
              text: loc.receive.details_share,
              onPress: handleSharePress,
            },
          ]}
        />
        <ListItem
          ref={listItem}
          key={`${item.key}`}
          button
          onPress={onPress}
          containerStyle={styles.container}
          onLongPress={showToolTipMenu}
        >
          <ListItem.Content style={styles.list}>
            <ListItem.Title style={styles.list} numberOfLines={1} ellipsizeMode="middle">
              <Text style={styles.index}>{item.index}</Text> <Text style={styles.address}>{item.address}</Text>
            </ListItem.Title>
            <ListItem.Subtitle style={[styles.list, styles.balance]}>{balance}</ListItem.Subtitle>
          </ListItem.Content>
          <AddressTypeBadge isInternal={item.isInternal} />
        </ListItem>
      </>
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
