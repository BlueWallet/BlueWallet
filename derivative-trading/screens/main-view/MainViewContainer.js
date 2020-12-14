import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import { ActivityIndicator, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { showMessage } from 'react-native-flash-message';
import { deriveCredentialsForWallet } from '../../class/AccountUtils';
import DataNormalizer, { APIResponseType } from '../../class/DataNormalization';
import RestApiClient from '../../class/RestApiClient';
import WebsocketClient from '../../class/WebsocketClient';
import TCModal from '../../components/TermsModal';
import { WS_BASE_URL } from '../../constants';
import { initialState, reducer, TradingDispatch } from '../../reducer';
import DerivativesTradingOpenedOrderDetailsScreen from '../open-orders/details/DerivativesTradingOpenedOrderDetailsScreen';
import MainView from './MainView';


const BlueApp = require('../../../BlueApp');

const MainViewContainer = ({
  navigation,
  route: {
    params: { fromWallet: wallet },
  },
}) => {

  const [state, dispatch] = useReducer(reducer, initialState)
  const wsClientRef = useRef(new WebsocketClient({}, WS_BASE_URL))

  useMemo(() => {
    if (state.hasLoadedProducts && state.isWsAuthenticated && !state.isLoadingCharts) {
      dispatch({ type: 'setIsLoadingInitialData', payload: false })
    }

  }, [state.hasLoadedProducts, state.isWsAuthenticated, state.isLoadingCharts])

  useEffect(() => {
    dispatch({ type: 'setIsLoadingInitialData', payload: true })
    setupUser();
    return (() => {
      wsClientRef.current.closeSocket()
    })
  }, []);

  useEffect(() => {
    if (state.isWsConnected) {
      wsClientRef.current.authenticate(state.apiKey);
    }
  }, [state.isWsConnected]);

  useEffect(() => {
    if (state.hasLoadedProducts) {
      loadAllProductCharts();
    }
  }, [state.hasLoadedProducts]);

  useEffect(() => {
    if (Object.values(state.userData).length !== 0 && !state.userData.hasAcceptedTerms) {
      dispatch({ type: 'setIsTermsModalOpen', payload: true })
    }
  }, [state.userData]);

  useEffect(() => {
    if (state.isWsAuthenticated) {
      wsClientRef.current.fetchProducts();
      wsClientRef.current.fetchOpenOrders();
      wsClientRef.current.fetchOpenPositions();
      wsClientRef.current.subscribeToChannels({ channels: ['position_states'] })
      wsClientRef.current.subscribeToChannels({ channels: ['open', 'fills', 'received', 'liquidation', 'matches', 'done', 'changes'] })
    }
    return (() => {
      wsClientRef.current.unsubscribeFromChannels({ channels: ['position_states'] })
      wsClientRef.current.unsubscribeFromChannels({ channels: ['open', 'fills', 'received', 'liquidation', 'matches', 'done', 'changes'] })
    })
  }, [state.isWsAuthenticated]);

  async function loadAllProductCharts() {
    const charts = {};

    let restClient = new RestApiClient({});

    for (var idx = 0; idx < state.availableProducts.length; idx++) {
      const chart = await restClient.fetchHistoricalIndexPrices({
        symbol: state.availableProducts[idx].underlyingSymbol,
        offsetStart: '24h',
        granularity: '15m',
      });
      charts[state.availableProducts[idx].symbol] = { chart: chart, product: state.availableProducts[idx] };
    }
    dispatch({ type: 'setProductCharts', payload: charts });
    dispatch({ type: 'setIsLoadingCharts', payload: false });
  }

  async function setupUser() {
    let existingUserData = await BlueApp.getKolliderUserData(wallet);
    existingUserData = JSON.parse(existingUserData)
    if (existingUserData) {
      let now = Math.round((new Date()).getTime() / 1000)
      if (typeof existingUserData.expires === undefined || typeof existingUserData.token === undefined) {
        registerUser()
      }
      if (now > existingUserData.expires) {
        loginUser({ username: existingUserData.username, password: existingUserData.password, email: existingUserData.email })
      }
      dispatch({ type: 'setApiKey', payload: existingUserData.token })
      dispatch({ type: 'setIsAuthenticated', payload: true })
      dispatch({ type: 'setUserData', payload: existingUserData })
      setupWebsockets()
    } else {
      registerUser()
    }
  }

  async function registerUser() {
    const credentials = deriveCredentialsForWallet(wallet);
    const restAPIClient = new RestApiClient();
    let resp = await restAPIClient.registerNewUser(credentials);
    if (resp.status === 201 || res.status === 409) {
      loginUser({ username: credentials.username, password: credentials.password, email: credentials.email })
    }
  }

  async function loginUser({ username, password, email }) {
    let apiClient = new RestApiClient({});
    let token = await apiClient.login({ username, password, email });
    let whoami = await apiClient.whoAmI()
    let newUserData = {
      token: token,
      email: email,
      password: password,
      username: username,
      expires: whoami.token.expires,
    }
    await BlueApp.setKolliderUserData(JSON.stringify(newUserData), wallet);
    dispatch({ type: 'setUserData', payload: newUserData })
    dispatch({ type: 'setIsAuthenticated', payload: true })
    dispatch({ type: 'setApiKey', payload: newUserData.token })
    setupWebsockets()
  }

  async function setupWebsockets() {
    wsClientRef.current.onMessage = msg => {
      handleWebSocketsMsg(JSON.parse(msg.data));
    };

    wsClientRef.current.onClose = event => {
      console.log('WebsocketClient -- Closed');
      dispatch({ type: 'setIsWsConnected', payload: false })
    };

    wsClientRef.current.onError = event => {
      console.log(`WebsocketClient -- Error: ${event.message}`);
    };
    wsClientRef.current.connect(() => {
      dispatch({ type: 'setIsWsConnected', payload: true })
    });
  }

  async function settleTrade(amount, symbol, side) {
    if (amount > 0) {
      dispatch({ type: 'setIsSettling', payload: true })
      let invoice = await wallet.addInvoice(amount, `Kollider Settlement for ${side} ${symbol}`);
      wsClientRef.current.withdrawalRequest(invoice, amount);
    }
  }

  async function payForTrade(invoice) {
    try {
      let res = await wallet.payInvoice(invoice);
    } catch (error) {
      showPaymentFailiure(error)
    }
  }

  function handleWebSocketsMsg(response) {
    if (DataNormalizer.isResponseOk(response)) { 
      const responseType = DataNormalizer.getAPIResponseType(response);
      if (responseType === APIResponseType.AUTHENTICATION) {
        if (response.data.message === 'success') {
          dispatch({ type: "setIsWsAuthenticated", payload: true })
        }
      } else if (responseType === APIResponseType.ORDER_REJECTION) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let rejectionReason = data.reason;
        showOrderRejectionAlert(rejectionReason);
      } else if (responseType === APIResponseType.OPEN_ORDERS) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let openOrders = data.open_orders;
        let oo = []
        Object.values(openOrders).map(openOrdersVec => {
          openOrdersVec.map(openOrder => {
            let o = DataNormalizer.openOrderFromPayload(openOrder)
            oo.push(o);
          })
        })
        dispatch({ type: 'setOpenOrders', payload: oo});
      } else if (responseType === APIResponseType.ORDER_OPENED) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let openOrder = DataNormalizer.openOrderFromPayload(data);
        showOrderOpenedAlert(openOrder);
        wsClientRef.current.fetchOpenOrders();
      } else if (responseType === APIResponseType.FILL) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let fill = DataNormalizer.fillFromPayload(data);
        wsClientRef.current.fetchOpenPositions();
        showOrderFillAlert(fill);
      } else if (responseType === APIResponseType.USER_POSITIONS) {
        let data = DataNormalizer.dataFromWsMessage(response);
        Object.values(data.positions).map(position => {
          let pos = DataNormalizer.positionStateFromPayload(position)
          if (pos.quantity > 0) {
            dispatch({ type: 'setPositionState', payload: pos })
          }
        })
      } else if (responseType === APIResponseType.POSITION_STATE) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let pos = DataNormalizer.positionStateFromPayload(data);
        // dispatch({ type: 'setPositionState', payload: pos })
      } else if (responseType === APIResponseType.SETTLEMENT_REQUEST) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let message = DataNormalizer.settlementRequestFromPayload(data);
        settleTrade(message.amount.toFixed(0), message.symbol, message.side)
      } else if (responseType === APIResponseType.ORDER_INVOICE) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let message = DataNormalizer.orderInvoiceFromPayload(data);
        payForTrade(message.invoice);
      } else if (responseType === APIResponseType.TICKER) {
        let ticker = DataNormalizer.dataFromWsMessage(response);
      } else if (responseType === APIResponseType.TRADABLE_SYMBOLS) {
        let data = DataNormalizer.dataFromWsMessage(response);
        let products = Object.values(data.symbols).map(product => DataNormalizer.productFromPayload(product));
        let pM = Object.fromEntries(products.map(product => {
          return [product.symbol, product]
        }));
        dispatch({ type: 'setProductMap', payload: pM })
        dispatch({ type: 'setAvailableProducts', payload: products })
        dispatch({ type: 'setHasLoadedProducts', payload: true })
      } else if (responseType === APIResponseType.ORDER_DONE) {
        wsClientRef.current.fetchOpenOrders();
        let data = DataNormalizer.dataFromWsMessage(response);
        let done = DataNormalizer.doneFromPayload(data)
        if (done.reason === 'Cancel') {
          showOrderCanceledMessage(done.orderId)
        }
      } else if (responseType === APIResponseType.USER_ACCOUNTS) {
      } else if (responseType === APIResponseType.WITHDRAWAL_SUCCESS) {
        dispatch({ type: 'setIsSettling', payload: false })
      } else if (responseType === APIResponseType.ERROR) {
        console.log('Message not parsable.');
      }
    }
  }

  function showOrderCanceledMessage({ order_id: orderID }) {
    const message = 'Order Canceled';

    const messageDescription = `Cancelled Order: ${orderID}`;
    showMessage({
      message,
      description: messageDescription,
      type: 'info',
    });
  }

  function showPaymentFailiure() {
    const message = 'Payment Failiure';

    const messageDescription = `We were unable to process a payment.`;

    showMessage({
      message,
      description: messageDescription,
      type: 'danger',
    });
  }

  function showOrderFillAlert(fill) {
    const message = 'Order Filled';
    const messageDescription = `Fill ${fill.quantity} ${fill.symbol} @ ${fill.price}`;
    showMessage({
      message,
      description: messageDescription,
      type: 'info',
    });
  }

  function showOrderRejectionAlert(rejectionReason) {
    const message = 'Order Rejected';
    const messageDescription = `Reason: ${rejectionReason}`;
    showMessage({
      message,
      description: messageDescription,
      type: 'danger',
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

  function navigateToProductDetails(product, currentPosition) {
    navigation.navigate('DerivativesTradingProductDetails', {
      key: `DerivativesTradingProductDetails-${product.symbol}`,
      wallet,
      product,
      isSettling: state.isSettling,
      wsClientRef,
      currentPosition,
      apiKey: state.apiKey,
    });
  }

  function onProductSelected(product) {
    let currentPosition = state.currentPositions[product.symbol];
    navigateToProductDetails(product, currentPosition);
  }

  function onPositionSelected(position) {
    let product = state.availableProducts.filter(product => product.symbol == position.symbol)[0]
    navigateToProductDetails(product, position);
  }

  function onOpenOrderSelected(order) {
    navigation.navigate(DerivativesTradingOpenedOrderDetailsScreen.navigationName, {
      key: DerivativesTradingOpenedOrderDetailsScreen.navigationKey(order),
      order,
      wsClientRef,
      product: state.availableProducts.filter(product => product.symbol === order.symbol)[0],
    });
  }

  const getErrorMessageText = () => {
    if (productsLoadingError !== null) {
      return `Error while loading products: ${productsLoadingError}`;
    }

    if (authError !== null) {
      return `Error while authenticating: ${authError}`;
    }

    return '';
  };

  async function onAcceptTerms() {
    let uD = { ...state.userData, hasAcceptedTerms: true };
    await BlueApp.setKolliderUserData(JSON.stringify(uD), wallet);
    dispatch({ type: 'setIsTermsModalOpen', payload: false });
    dispatch({ type: 'setUserData', payload: uD });
  }

  function onDeclineTerms() {
    navigation.goBack();
  }

  return (
    <TradingDispatch.Provider value={[state, dispatch]}>
      <View style={styles.rootContainer}>
        <StatusBar barStyle="default" backgroundColor={'black'} />
        {
          state.isLoadingInitialData ? (
            <View style={{ height: '100%', margin: 'auto', justifyContent: 'center' }}>
              <ActivityIndicator size='large' color="#5d5dff" />
            </View>
          ) : (
              <MainView
                wallet={wallet}
                products={state.availableProducts}
                productMap={state.eproductMap}
                isLoadingProducts={state.isLoadingProducts}
                isLoadingCharts={state.isLoadingCharts}
                productCharts={state.productCharts}
                productsLoadingError={state.productsLoadingError}
                onProductSelected={onProductSelected}
                currentPositions={state.currentPositions}
                onPositionSelected={onPositionSelected}
                openOrders={state.openOrders}
                onOpenOrderSelected={onOpenOrderSelected}
                apiKey={state.apiKey}
                wsClientRef={wsClientRef}
              />
            )
        }
        <TCModal isVisible={state.isTermsModalOpen} onAccept={onAcceptTerms} onDecline={onDeclineTerms} />
      </View>
    </TradingDispatch.Provider>
  );
};

MainViewContainer.navigationOptions = ({ navigation, route }) => ({
  headerTitle: () => {
    return (
      <View style={[styles.headerIcon, { left: Platform.OS === 'ios' ? 0 : 0 }, { flexDirection: 'row', justifyContent: 'center' }]}>
        <Image source={require('../../../img/derivatives-trading/kollider_icon_white.png')} style={{ height: 22, width: 22 }} />
        <Text style={{ color: 'white', fontSize: 18, marginLeft: 5 }}>Kollider</Text>
      </View>
    )
  },
  headerRight: () => {
    return (
      <View style={styles.navSettingsButton}>
        <TouchableOpacity onPress={() => {
          navigation.navigate('DerivativesTradingSettingsMainContainer', {
            key: `Settings`,
            wallet: route.params.fromWallet,
          });
        }}
        >
          <Icon
            name='cog'
            type='font-awesome'
            color='#fff'
          />
        </TouchableOpacity>
      </View>
    )
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

const styles = StyleSheet.create({
  navHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    alignItems: 'center',
    textAlign: 'center',

    marginLeft: 0,
    marginTop: 10,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  navSettingsButton: {
    padding: 10,
  }
});

MainViewContainer.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      fromWallet: PropTypes.object.isRequired,
    }),
  }),
};

export default MainViewContainer;
