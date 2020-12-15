import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, ListItem } from 'react-native-elements';
import { BlueCurrentTheme } from '../../../components/themes';
import DataNormalizer from '../../class/DataNormalization';
import { RestApiClient } from '../../class/RestApiClient';
import TradingDataStyles from '../../class/styles/TradingDataStyles';
import { priceToDollars } from '../../class/Utils';
import LeverageBadge from '../../components/LeverageBadge';
import DerivativesTradingOpenedOrder from '../../models/OpenedOrder';
import { PositionSide } from '../../models/Position';

const OpenedOrderListItem = ({ order, onPress, product, apiKey }) => {

  const [orderInfo, setOrderInfo] = useState({
    value: 0,
    estimatedLiquidationPrice: 0,
    exchangeFees: 0,
    marginRequired: 0
  })

  useEffect(() => {
    getOrderInfo()
  }, [])

  async function getOrderInfo() {
    let apiClient = new RestApiClient({apiKey})
    let o = {
      quantity: order.quantity,
      leverage: order.leverage,
      margin_type: order.marginType,
      settlement_type: 'Delayed',
      price: order.price,
      order_type: order.orderType,
      ext_order_id: order.externalOrderId,
      side: order.side,
      symbol: order.symbol
    }
    let info = await apiClient.fetchOrderInfo({order: o})
    info = DataNormalizer.orderInfoFromPayload(info)
    setOrderInfo(info)
  }

  const subtitleStyles = useMemo(() => {
    const colorName = order.side === PositionSide.BID ? 'tradingProfit' : 'tradingLoss';

    return {
      ...styles.subtitleText,
      color: BlueCurrentTheme.colors[colorName],
    };
  }, [order.side]);

  const subtitleText = useMemo(() => {
    const sideText = order.side === 'Bid' ? 'BUY' : 'SELL';
    const priceText = priceToDollars(order.price, product);

    return `${sideText} @ $ ${priceText}`;
  }, [order.side, order.price]);


  return (
    <ListItem containerStyle={{ backgroundColor: 'black'}} onPress={() => onPress()}>
      <Avatar source={product.avatarImage} size={40}/>
      <ListItem.Content style={styles.listItemContainer}>
        <View style={styles.titleGroup}>
          <View style={styles.mainTitleRow}>
            <Text style={styles.titleText}>{order.currencyPair}</Text>
              <LeverageBadge style={styles.leverageBadge} leverage={order.leverage / 100} />
          </View>
          <Text style={styles.titleMarginTypeText}>({order.marginType} Margin)</Text>
          <Text style={subtitleStyles}>{subtitleText}</Text>
          </View>
        <View>
          <View style={styles.dataGroupItems}>
            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>Size</Text>
              <Text style={TradingDataStyles.dataItemValue}>{order.quantity}</Text>
            </View>

            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>Filled</Text>
              <Text style={TradingDataStyles.dataItemValue}>{order.quantityFilled}</Text>
            </View>

            <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
              <Text style={TradingDataStyles.dataItemLabel}>Total Cost</Text>
              <Text style={TradingDataStyles.dataItemValue}>{orderInfo.marginRequired.toFixed(0)} Sats</Text>
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
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  leftElementContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    flex: 0,
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
    transform: [{ scale: 0.75 }],
  },

  titleText: {
    fontSize: 16,
    fontWeight: '600',
    flexDirection: 'row',
    color: 'white',
  },

  subtitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: BlueCurrentTheme.colors.tradingProfit,
  },

  titleMarginTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },

  dataGroupItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  dataGroupItem: {
    marginLeft: 10,
  },
});

OpenedOrderListItem.propTypes = {
  onPress: PropTypes.func,
};

OpenedOrderListItem.defaultProps = {
  onPress: () => { },
};
export default OpenedOrderListItem;
