import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
      <View>
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
          containerStyle={stylesHook.container}
          onLongPress={showToolTipMenu}
        >
          <ListItem.Content style={stylesHook.list}>
            <ListItem.Title style={stylesHook.list} numberOfLines={1} ellipsizeMode="middle">
              <Text style={[styles.index, stylesHook.index]}>{item.index + 1}</Text>{' '}
              <Text style={[stylesHook.address, styles.address]}>{item.address}</Text>
            </ListItem.Title>
            <ListItem.Subtitle style={[stylesHook.list, styles.balance, stylesHook.balance]}>{balance}</ListItem.Subtitle>
          </ListItem.Content>
          <AddressTypeBadge isInternal={item.isInternal} />
        </ListItem>
      </View>
    );
  };

  return render();
};

const styles = StyleSheet.create({
  address: {
    fontWeight: '600',
    marginHorizontal: 40,
  },
  index: {
    fontSize: 15,
  },
  balance: {
    marginTop: 8,
    marginLeft: 14,
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
