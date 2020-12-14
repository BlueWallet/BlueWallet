import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, useColorScheme } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import loc from '../../../../loc';
import NavbarStyles from '../../../class/styles/NavbarStyles';
import DerivativesTradingOpenedOrder from '../../../models/OpenedOrder';
import { BlueButton } from '../../../../BlueComponents';
import { BlueCurrentTheme } from '../../../../components/themes';
import CurrencyPairAvatar from '../../../components/CurrencyPairAvatar';
import OrderSummaryStyles from '../../../class/styles/OrderSummaryStyles';
import LinearGradient from 'react-native-linear-gradient';
import LeverageBadge from '../../../components/LeverageBadge';
import { PositionSide } from '../../../models/Position';
import { OrderType } from '../../../models/TradingTypes';
import { calculateOrderCostForProduct } from '../../../class/OrderCalculationUtils';

const leverageBadgeWidth = 60;
const leverageBadgeHeight = 26;

const LeverageBadgeTooltip = ({ leverage, style, badgeStyles }) => {
  const colorScheme = useColorScheme();
  const backgroundColor = 'white';
  const pointerStyles = {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: leverageBadgeWidth / 2,
    borderLeftWidth: leverageBadgeWidth / 8,
    borderRightWidth: leverageBadgeWidth / 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: backgroundColor,
    transform: [{ scaleY: 0.5 }, { translateY: -(leverageBadgeHeight / 2) }],
  };

  return (
    <View style={{ ...style, ...{ alignItems: 'center', justifyContent: 'flex-start' } }}>
      <LeverageBadge leverage={leverage} style={{ ...badgeStyles, ...{ backgroundColor } }} />
      <View style={pointerStyles} />
    </View>
  );
};

const DerivativesTradingOpenedOrderDetailsScreen = ({
  navigation,
  route: {
    params: { order, wsClientRef, product },
  },
}) => {
  const isAPISocketConnected = useMemo(() => {
    return wsClientRef.current.isConnected;
  }, [wsClientRef.current]);

  function cancelOrder() {
    const payload = {
      symbol: order.symbol,
      order_id: order.orderId,
      old_quantity: order.quantity,
      new_quantity: 0,
      settlement_type: 'Instant',
      leverage: order.leverage,
      side: order.side,
      margin_type: 'Isolated',
    };
    console.log('Cancelling Order');
    console.log(payload);
    wsClientRef.current.cancelOrder(payload);
    navigation.goBack();
  }

  const HeaderSection = () => {
    const orderTypeText = useMemo(() => {
      if (order.orderType === OrderType.LIMIT) {
        return 'Limit ';
      } else if (order.orderType === OrderType.MARKET) {
        return 'Market ';
      }

      return '';
    }, [order]);

    const subtitleText = useMemo(() => {
      const sideText = order.side === PositionSide.BID ? 'Buy' : 'Sell';
      let price = (order.price / Math.pow(10, product.priceDp)).toFixed(product.priceDp);
      const entryPriceText = price;

      return `${orderTypeText}${sideText} @ $${entryPriceText}`;
    }, [order]);

    const subtitleColorStyle = useMemo(() => {
      const themeColorName = order.side === PositionSide.BID ? 'tradingProfit' : 'tradingLoss';

      return { color: BlueCurrentTheme.colors[themeColorName] };
    }, [order]);

    return (
      <View style={styles.headerSection}>
        <Text style={[OrderSummaryStyles.screenHeadline, styles.screenHeadline]}>Summary</Text>
        <CurrencyPairAvatar symbol={order.symbol} containerStyles={styles.avatarContainer} />

        <Text style={OrderSummaryStyles.screenHeadline}>{order.symbol.split('.')[0]}</Text>
        <Text style={[styles.headerSubtitleText, subtitleColorStyle]}>{subtitleText}</Text>
      </View>
    );
  };

  const StatsSection = () => {
    const totalCostText = useMemo(() => {
      // TODO: Figure out how to calculate the actual cost here.
      let price = (order.price / Math.pow(10, product.priceDp)).toFixed(product.priceDp);
      let leverage = (order.leverage / Math.pow(10, 2)).toFixed(2);
      const cost = calculateOrderCostForProduct(product, order.quantity, price, leverage);
      return `${cost} Sats`;
    }, [order]);

    const totalSizeText = useMemo(() => {
      const suffix = order.quantity === 1 ? '' : 's';

      return `${order.quantity} Contract${suffix}`;
    }, [order]);

    const filledText = useMemo(() => {
      const suffix = order.quantityFilled === 1 ? '' : 's';

      return `${order.quantityFilled} Contract${suffix}`;
    }, [order]);

    const remainingText = useMemo(() => {
      const quantityRemaining = order.quantity - order.quantityFilled;
      const suffix = quantityRemaining === 1 ? '' : 's';

      return `${quantityRemaining} Contract${suffix}`;
    }, [order]);

    return (
      <View style={styles.statsSection}>
        <View style={OrderSummaryStyles.breakdownItemGroup}>
          <Text style={[OrderSummaryStyles.breakdownItemLabel, styles.breakdownItemLabel]}>Total Cost:</Text>
          <Text style={[OrderSummaryStyles.breakdownItemValue, styles.breakdownItemValue]}>{totalCostText}</Text>
        </View>

        <View style={OrderSummaryStyles.breakdownItemGroup}>
          <Text style={[OrderSummaryStyles.breakdownItemLabel, styles.breakdownItemLabel]}>Total Size:</Text>
          <Text style={[OrderSummaryStyles.breakdownItemValue, styles.breakdownItemValue]}>{totalSizeText}</Text>
        </View>

        <View style={OrderSummaryStyles.breakdownItemGroup}>
          <Text style={[OrderSummaryStyles.breakdownItemLabel, styles.breakdownItemLabel]}>Filled:</Text>
          <Text style={[OrderSummaryStyles.breakdownItemValue, styles.breakdownItemValue]}>{filledText}</Text>
        </View>

        <View style={OrderSummaryStyles.breakdownItemGroup}>
          <Text style={[OrderSummaryStyles.breakdownItemLabel, styles.breakdownItemLabel]}>Remaining:</Text>
          <Text style={[OrderSummaryStyles.breakdownItemValue, styles.breakdownItemValue]}>{remainingText}</Text>
        </View>
      </View>
    );
  };

  const LeverageDisplaySection = () => {
    const tooltipContainerStyles = {
      position: 'absolute',
      width: '100%',
      alignItems: 'center',
      marginTop: -(leverageBadgeHeight * 1.25),
      flexDirection: 'row',
    };

    const tooltipOffsetStyles = {
      transform: [{ translateX: -(leverageBadgeWidth / 2) }],
      marginLeft: `${order.leverage / 100}%`,
    };

    const marginTypeText = useMemo(() => {
      return `(${order.marginType} Margin)`;
    }, [order]);

    return (
      <View style={styles.leverageDisplaySection}>
        <LinearGradient
          style={styles.leverageStrip}
          colors={[
            BlueCurrentTheme.colors.tradingLeverageMin,
            BlueCurrentTheme.colors.tradingLeverageMid,
            BlueCurrentTheme.colors.tradingLeverageMax,
          ]}
          start={{ x: 0.0, y: 0.0 }}
          end={{ x: 1.0, y: 0.0 }}
        />

        <View style={tooltipContainerStyles}>
          <LeverageBadgeTooltip style={tooltipOffsetStyles} badgeStyles={styles.leverageBadge} leverage={order.leverage / 100} />
        </View>

        <View style={styles.leverageFooterTextGroup}>
          <Text style={styles.leverageFooterTextHeadingText}>Leverage</Text>
          <Text style={styles.leverageFooterMarginTypeText}>{marginTypeText}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.mainContentContainer}>
      <HeaderSection />
      <StatsSection />
      <LeverageDisplaySection />

      <View style={styles.cancelButtonContainer}>
        <BlueButton
          backgroundColor={BlueCurrentTheme.colors.tradingLoss}
          title="Cancel Order"
          onPress={cancelOrder}
          width={'75%'}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mainContentContainer: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: 'black',
  },

  screenHeadline: {
    marginBottom: 20,
  },

  headerSection: {
    marginBottom: 48,
    alignItems: 'center',
  },

  statsSection: {
    marginBottom: 48,
  },

  leverageDisplaySection: {
    alignItems: 'center',
    marginBottom: 48,
  },

  avatarContainer: {
    width: 80,
    height: 80,
  },

  headerSubtitleText: {
    fontSize: 18,
    fontWeight: '700',
  },

  breakdownItemLabel: {
    fontWeight: '700',
  },

  breakdownItemValue: {
    fontWeight: '600',
  },

  leverageStrip: {
    height: 27,
    width: '100%',
  },

  leverageBadge: {
    width: leverageBadgeWidth,
    height: leverageBadgeHeight,
  },

  leverageFooterTextGroup: {
    marginTop: 8,
    justifyContent: 'center',
    flexDirection: 'row',
  },

  leverageFooterTextHeadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white'
  },

  leverageFooterMarginTypeText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },

  cancelButtonContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    color: 'white'
  },
});

DerivativesTradingOpenedOrderDetailsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      order: PropTypes.instanceOf(DerivativesTradingOpenedOrder).isRequired,
      wsClientRef: PropTypes.object.isRequired,
    }),
  }),
};

DerivativesTradingOpenedOrderDetailsScreen.navigationOptions = {
  // ...BlueNavigationStyle(navigation, true),
  headerTitle: () => {
    return <Text style={NavbarStyles.navHeaderTitle}>{loc.derivatives_trading.opened_order_details.title}</Text>;
  },
  headerStyle: {
    backgroundColor: 'black',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOffset: { height: 0, width: 0 },
  },
  headerTintColor: '#FFFFFF',
  headerBackTitleVisible: false,
};

DerivativesTradingOpenedOrderDetailsScreen.navigationName = 'DerivativesTradingOpenedOrderDetailsScreen';

DerivativesTradingOpenedOrderDetailsScreen.navigationKey = order => {
  return `${DerivativesTradingOpenedOrderDetailsScreen.navigationName}-${order.symbol}`;
};

export default DerivativesTradingOpenedOrderDetailsScreen;
