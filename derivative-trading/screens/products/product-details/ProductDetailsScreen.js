import React, { useEffect, useMemo, useState, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import DerivativesTradingPosition from '../../../models/Position';
import { ScrollView } from 'react-native-gesture-handler';
import RestApiClient from '../../../class/RestApiClient';
import ProductStatsSection from './ProductStatsSection';
import TradingLaunchFooter from './TradingLaunchFooter';
import TradingDataStyles from '../../../class/styles/TradingDataStyles';
import { showMessage } from 'react-native-flash-message';
import CurrentPositionSection from './CurrentPositionSection';
import { v4 as uuidV4 } from 'react-native-uuid'
import DataNormalizer, {APIResponseType} from '../../../class/DataNormalization';
import { formatCurrencyValue, convertToChartData } from '../../../class/Utils';
import PriceChartView from '../../../components/PriceChartView';
import FullViewLoader from '../../../components/FullViewLoader';


const ProductDetailsScreen = ({
  navigation,
  route: {
    params: { wallet, product, currentPosition: initialPositionData, wsClientRef, apiKey},
  },
}) => {
  const isWSClientConnected = useMemo(() => {
    return wsClientRef.current.isConnected;
  }, [wsClientRef.current]);

  const [chartData, setChartData] = useState([]);
  const [chartStats, setChartStats] = useState({
    open: 0,
    close: 0,
    high: 0,
    low: 0
  });
  const [isFetchingChartData, setIsFetchingChartData] = useState(false);
  const [isFetchingTickerData, setIsFetchingTickerData] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [ticker, setTicker] = useState({
    bestBid: 0,
    bestAsk: 0,
    mid: 0,
  });
  const [currentPosition, setCurrentPosition] = useState(initialPositionData);

  const messageHandler = message => {
    handleWebSocketsAPIResponse(JSON.parse(message.data));
  };
  const msgHandlerRef = useRef(messageHandler);

  const hasCurrentPosition = useMemo(() => {
    return currentPosition !== undefined;
  }, [currentPosition]);

  useEffect(() => {
    if (isWSClientConnected) {
      wsClientRef.current.addEventListener('message', msgHandlerRef.current);
      wsClientRef.current.fetchTicker(product.symbol);
      wsClientRef.current.fetchOpenPositions()
    }

    return () => {
      wsClientRef.current.removeEventListener('message', msgHandlerRef.current);
    };
  }, [wsClientRef.current, isWSClientConnected]);

  useEffect(() => {
    fetchHistoricalPrices({ timeFrame: '1h', granularity: '1m' });
  }, []);

  function muteWs() {
    wsClientRef.current.removeEventListener('message', msgHandlerRef.current);
  }

  function unMuteWs() {
    wsClientRef.current.addEventListener('message', msgHandlerRef.current);
  }

  async function fetchTicker() {
    setIsFetchingTickerData(true);
    const restAPIClient = new RestApiClient();
    const ticker = await restAPIClient.fetchTicker({
      symbol: product.symbol,
    });
    setTicker(ticker);
    setIsFetchingTickerData(false);
  }

  async function fetchHistoricalPrices({ timeFrame, granularity }) {
    setIsFetchingChartData(true);

    const restAPIClient = new RestApiClient();
    const data = await restAPIClient.fetchHistoricalIndexPrices({
      symbol: product.underlyingSymbol,
      offsetStart: timeFrame,
      granularity: granularity,
    });
    let chartData = convertToChartData(data);
    setChartStats({
      low: chartData.low,
      high: chartData.high,
      close: chartData.close,
      open: chartData.open,
    });
    setChartData(chartData.data);
    setIsFetchingChartData(false);
  }

  useEffect(() => {
    wsClientRef.current.fetchTicker(product.symbol);
    wsClientRef.current.subscribeToChannels({ channels: ['ticker'], symbols: [product.symbol] })
    return function unsubscribe() {
      wsClientRef.current.unsubscribeFromChannels({ channels: ['ticker'], symbols: [product.symbol] })
    };
  }, [isWSClientConnected])

  const OHLCSummary = ({ position, style }) => {
    return (
      <View style={[...style]}>
        <View style={[TradingDataStyles.labeledDataVGroup]}>
          <Text style={TradingDataStyles.dataItemLabel}>Open</Text>
          <Text style={TradingDataStyles.dataItemValue}>${chartStats.open}</Text>
        </View>

        <View style={[TradingDataStyles.labeledDataVGroup]}>
          <Text style={TradingDataStyles.dataItemLabel}>High</Text>
          <Text style={TradingDataStyles.dataItemValue}>${chartStats.high}</Text>
        </View>

        <View style={[TradingDataStyles.labeledDataVGroup]}>
          <Text style={TradingDataStyles.dataItemLabel}>Low</Text>
          <Text style={TradingDataStyles.dataItemValue}>${chartStats.low}</Text>
        </View>

        <View style={[TradingDataStyles.labeledDataVGroup]}>
          <Text style={TradingDataStyles.dataItemLabel}>Close</Text>
          <Text style={TradingDataStyles.dataItemValue}>${chartStats.close}</Text>
        </View>
      </View>
    );
  };

  function onOpenTradingModal() {
    console.log('opening modal');
    wsClientRef.current.unsubscribeFromChannels({ channels: ['ticker'], symbols: [product.symbol] })
    muteWs();
  }

  function onCloseTradingModal() {
    unMuteWs();
    wsClientRef.current.subscribeToChannels({ channels: ['ticker'], symbols: [product.symbol] })
  }

  function launchToBuyProduct() {
    navigation.navigate('DTTradingRoot', {
      screen: 'DTSelectQuantity',
      params: {
        key: `DTSelectQuantity-${product.symbol}`,
        wallet,
        product,
        wsClientRef,
        currentPosition,
        side: 'Bid',
        orderType: 'Market',
        ticker: ticker,
        apiKey,
      },
    });
  }

  function launchToSellProduct() {
    navigation.navigate('DTTradingRoot', {
      screen: 'DTSelectQuantity',
      params: {
        key: `DTSelectQuantity-${product.symbol}`,
        wallet,
        product,
        currentPosition,
        wsClientRef,
        side: 'Ask',
        orderType: 'Market',
        ticker: ticker,
        apiKey,
      },
    });
  }

  function closePosition() {
    const closeOrder = {
      symbol: currentPosition.symbol,
      side: currentPosition.side === 'Bid' ? 'Ask' : 'Bid',
      order_type: 'Market',
      price: parseFloat(100000),
      quantity: currentPosition.quantity,
      leverage: 1000,
      margin_type: 'Isolated',
      ext_order_id: uuidV4(),
      settlement_type: 'Instant',
    }
    console.log('Close Order')
    console.log(closeOrder);
    wsClientRef.current.placeOrder(closeOrder);
  }

  function handleWebSocketsAPIResponse(response) {
    console.log('response on product detail screen');
    if (DataNormalizer.isResponseOk(response)) {
      const responseType = DataNormalizer.getAPIResponseType(response);
      if (responseType === APIResponseType.ORDER_RECEIVED) {
        showOrderReceivedMessage(DataNormalizer.receivedFromPayload(response));
      } else if (responseType === APIResponseType.ORDER_REJECTION) {
        // showOrderRejectedMessage(APIParser.rejectedOrderInfoFromResponse(response));
      } else if (responseType === APIResponseType.POSITION_STATE) {
        let data = DataNormalizer.dataFromWsMessage(response);
        handleNewPositionState(DataNormalizer.positionStateFromPayload(data));
      } else if (responseType === APIResponseType.INDEX_VALUE) {
        const price = Number(response.data.value);
        setCurrentPrice(price);
      } else if (responseType === APIResponseType.TICKER) {
        let data = DataNormalizer.dataFromWsMessage(response);
        setTicker(DataNormalizer.tickerFromPayload(data))
      }
    }
  }

  function showOrderReceivedMessage({ quantity, symbol, price }) {
    const message = 'Order Received';
    const messageDescription = `Received Order: ${quantity} ${symbol} @ ${price}`;

    showMessage({
      message,
      description: messageDescription,
      type: 'info',
    });
  }

  function showOrderOpenedAlert({ symbol, quantity, price }) {
    const message = 'Order Opened';
    const messageDescription = ` Order open: ${quantity} ${symbol} @ ${price}`;

    showMessage({
      message,
      description: messageDescription,
      type: 'success',
    });
  }

  function showOrderRejectedMessage({ externalOrderID, reason }) {
    const message = 'Order Rejected';
    const messageDescription = `Order Rejected: ${reason}`;

    showMessage({
      message,
      description: messageDescription,
      type: 'danger',
    });
  }

  function showOrderPending() {
    const message = 'Order Pending';
    let messageDescription = 'Waiting to payment.'
    showMessage({
      message,
      description: messageDescription,
      type: 'info',
    });
  }

  function showPaymentFailiure(error) {
    const message = 'Payment failed';
    const messageDescription = `Payment for order: failed. ${error}`;
    showMessage({
      message,
      description: messageDescription,
      type: 'danger',
    });
  }

  /**
   *
   * @param {DerivativesTradingPosition} position
   */
  function handleNewPositionState(position) {
    console.log(position);
    if (position.symbol === product.symbol) {
      if (position.quantity === 0) {
        setCurrentPosition(undefined);
      } else {
        setCurrentPosition(position);
      }
    }
  }

  const ChartTimeSelect = () => {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <View style={styles.chartTimeButton}>
          <TouchableOpacity onPress={() => fetchHistoricalPrices({ timeFrame: '1h', granularity: '1m' })}>
            <Text style={styles.chartTimeButtonText}>1H</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartTimeButton}>
          <TouchableOpacity onPress={() => fetchHistoricalPrices({ timeFrame: '24h', granularity: '15m' })}>
            <Text style={styles.chartTimeButtonText}>1D</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartTimeButton}>
          <TouchableOpacity onPress={() => fetchHistoricalPrices({ timeFrame: '1w', granularity: '8h' })}>
            <Text style={styles.chartTimeButtonText}>1W</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartTimeButton}>
          <TouchableOpacity onPress={() => fetchHistoricalPrices({ timeFrame: '4w', granularity: '24h' })}>
            <Text style={styles.chartTimeButtonText}>1M</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      <ScrollView contentContainerStyle={styles.mainContentContainer}>
        <View style={styles.scrollingContentContainer}>
          <View style={[styles.nonLastViewSection]}>
            <PriceChartView ticker={ticker} data={chartData} product={product} />
            <ChartTimeSelect />

            {hasCurrentPosition && (
              <View style={styles.nonLastViewSection}>
                <CurrentPositionSection position={currentPosition} wsClientRef={wsClientRef} product={product} ticker={ticker} />
              </View>
            )}

            <ProductStatsSection product={product} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.tradingFooterContainer}>
        <TradingLaunchFooter
          product={product}
          onBuySelected={launchToBuyProduct}
          onSellSelected={launchToSellProduct}
          onClosePositionSelected={closePosition}
          canClosePosition={hasCurrentPosition}
          baseFooterHeight={baseFooterHeight}
          bottomOffset={extraFooterOffset}
          onOpenTradingModal={onOpenTradingModal}
          onCloseTradingModal={onCloseTradingModal}
        />
      </View>
    </View>
  );
};

const baseFooterHeight = 72;
const extraFooterOffset = 0;

const styles = StyleSheet.create({
  mainContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        paddingBottom: baseFooterHeight + extraFooterOffset,
      },
      android: {
        paddingBottom: baseFooterHeight,
      },
    }),
    paddingTop: extraFooterOffset,
    backgroundColor: 'black',
    minHeight: '100%',
  },

  scrollingContentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    ...Platform.select({
      ios: {
        paddingBottom: baseFooterHeight + extraFooterOffset,
      },
      android: {
        paddingBottom: baseFooterHeight,
      },
    }),
  },

  nonLastViewSection: {
    marginBottom: 41,
  },

  hPaddedSection: {
    paddingHorizontal: 20,
  },

  navHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
  },

  ohlcSummary: {
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  tradingFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  dataSection: {
    paddingHorizontal: 14,
  },

  chartTimeButton: {
    padding: 10,
    backgroundColor: 'transparent',
    height: 30,
    width: '25%',
  },

  chartTimeButtonText: {
    textAlign: 'center',
    color: 'white',
  },

  dataRow: {
    flexDirection: 'row',
  },

  marginedRow: {
    marginBottom: 24,
  },

  mainTicker: {
    fontSize: 42,
    marginLeft: 20,
    left: -25,
    textAlign: 'center',
    width: '100%',
    color: 'white',
  },

  mainTickerMidPrice: {
    textAlign: 'center',
    fontSize: 42,
    color: 'white',
  },

  mainTickerBidAskPrice: {
    textAlign: 'center',
    fontSize: 12
  },
  currencySymbol: {
    fontSize: 22
  },
  bidPriceText: {
    color: 'rgb(0, 204, 102)',
  },
  bidPriceTextValue: {
    fontSize: 20
  },
  askPriceTextValue: {
    fontSize: 20
  },
  askPriceText: {
    color: 'rgb(189, 44, 30)',
  },
  spreadDivider: {
    fontSize: 19,
    color: 'white',
  }

});

ProductDetailsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      wallet: PropTypes.object.isRequired,
      product: PropTypes.object.isRequired,
      currentPosition: PropTypes.object,
      wsClientRef: PropTypes.object.isRequired,
      restAPIKey: PropTypes.string.isRequired,
      indexPriceHistory: PropTypes.arrayOf(PropTypes.object),
    }),
  }),
};

ProductDetailsScreen.navigationOptions = ({
  navigation,
  route: {
    params: { product },
  },
}) => ({
  // ...BlueNavigationStyle(navigation, true),
  headerTitle: () => {
    return <Text style={styles.navHeaderTitle}>{product.currencyPair}</Text>;
  },
  headerStyle: {
    backgroundColor: 'black',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOffset: { height: 0, width: 0 },
  },
  headerTintColor: '#FFFFFF',
  headerBackTitleVisible: false,
});

export default ProductDetailsScreen;
