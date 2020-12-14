import React, { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import TradingDataStyles from '../../class/styles/TradingDataStyles';
import LeverageBadge from '../../components/LeverageBadge';


const CurrentPositionListItem = ({ product, onPress, currentPosition}) => {
  const side = () => {
    console.log(currentPosition.side);
    return currentPosition.side === 'Bid' ? 'BUY' : 'SELL';
  }
  return (
    <ListItem containerStyle={{ backgroundColor: 'black' }} onPress={() => onPress()}>
      <Avatar source={product.avatarImage}/>
      <ListItem.Title style={{ backgroundColor: 'black' }}>
        {/* <CurrencyPairAvatar symbol={currentPosition.symbol} containerStyles={styles.avatarContainer} /> */}
        <View style={styles.titleGroup}>
          <View style={styles.mainTitleRow}>
            <Text style={styles.titleText}>{currentPosition.currencyPair}</Text>
            <LeverageBadge style={styles.leverageBadge} leverage={currentPosition.leverage} />
          </View>
          <Text style={styles.subtitleText}>{side()}</Text>
        </View>
      </ListItem.Title>
      <ListItem.Content style={styles.listItemContainer}>
        <View>
          <View style={styles.dataGroupItems}>
            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>Size</Text>
              <Text style={TradingDataStyles.dataItemValue}>{currentPosition.quantity}</Text>
            </View>

            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>Liq. Price</Text>
              <Text style={TradingDataStyles.dataItemValue}>{currentPosition.liqPrice}</Text>
            </View>

            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>uPnL</Text>
              <Text style={TradingDataStyles.dataItemValue}>{currentPosition.upnl}</Text>
            </View>
          </View>
        </View>
      </ListItem.Content>
    </ListItem>
  )
};

const styles = StyleSheet.create({
  listItemContainer: {
    flexDirection: 'row',
    backgroundColor: 'black',
  },

  leftElementContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    flex: 0,
    backgroundColor: 'black',
    marginRight: 24,
  },

  rightElementContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    flex: 1,
  },

  avatarContainer: {
    marginRight: 10,
    width: 38,
    height: 38,
  },

  mainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  leverageBadge: {
    marginLeft: 5,
    transform: [{ scale: 0.90 }],
  },

  titleText: {
    fontSize: 16,
    fontWeight: '600',
    flexDirection: 'row',
    color: 'white',
  },

  subtitleText: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },

  dataGroupItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    // backgroundColor: 'blue',
    marginRight: 10,
  },

  dataGroupItem: {
    marginRight: 15
  },
});

CurrentPositionListItem.propTypes = {
  currentPosition: PropTypes.object.isRequired,
  onPress: PropTypes.func,
};

CurrentPositionListItem.defaultProps = {
  onPress: () => { },
};

export default CurrentPositionListItem;
