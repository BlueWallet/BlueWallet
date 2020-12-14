import React, { useMemo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
    calculateLiquidationPriceFromMarginAndFees,
    calculateOrderValueForProduct,
    calculateOrderCostForProduct,
    calculateRequiredMargin,
    calculateTradingFees,
} from '../../class/OrderCalculationUtils';
import DerivativesTradingFeesInfo from '../../models/FeesInfo';
import OrderReviewStyles from '../../class/styles/trading-flow/OrderReviewStyles';
import OrderReviewActionButtonFooter from '../../components/trading-flow/OrderReviewActionButtonFooter';
import RestApiClient from '../../class/RestApiClient';

import { v4 as uuidV4 } from 'react-native-uuid'

const baseFooterHeight = 102;
const extraFooterOffset = 20;

const DTOrderSummay = ({
    navigation,
    route: {
        params: { wallet, product, wsClientRef, quantity, leverage, orderType, side, limitPrice, currentPosition, apiKey },
    },
}) => {
    const [ticker, setTicker] = useState({
        bestAsk: 0,
        bestBid: 0,
        mid: 0,
    });

    const [orderFees, setOrderFees] = useState(0);

    const [costOfOrder, setCostOfOrder] = useState(null);
    const [stagedOrder, setStagedOrder] = useState(null);
    const [orderInfo, setOrderInfo] = useState([]);

    const feesInfo = new DerivativesTradingFeesInfo({
        maker: -0.00025,
        taker: 0.00075,
    });

    const fundingRate = 0;

    const restAPIClient = new RestApiClient({apiKey});

    async function pollTicker() {
        let data = await restAPIClient.fetchTicker({ symbol: product.symbol });
        setTicker(data)
    }

    useEffect(() => {
        pollTicker();
        let poller = setInterval(pollTicker, 2000);
        return () => {
            clearInterval(poller)
        }
    }, []);

    useMemo(() => {
        let price = orderType === 'Market' ? (ticker.mid) : (limitPrice);
        let orderPrice = (price * Math.pow(10, product.priceDp)).toFixed(0);
        let order = {
            symbol: product.symbol,
            side,
            order_type: orderType,
            price: parseFloat(orderPrice),
            quantity,
            leverage: leverage * 100,
            ext_order_id: uuidV4(),
            margin_type: 'Isolated',
            settlement_type: 'Instant',
        }
        setStagedOrder(order);
    }, [side, orderType, quantity, leverage, product])

    useEffect(() => {
        if (stagedOrder !== null) {
            getOrderInfo();
        }
    }, [stagedOrder])

    async function getOrderInfo() {
        let info = await restAPIClient.fetchOrderInfo({order: stagedOrder});
        console.log(info);
        let oi = {
            fees: Number(info.exchange_fee).toFixed(0),
            value: Number(info.value).toFixed(2),
            margin: Math.abs(Number(info.margin_required).toFixed(0)),
            liquidationPrice: Number(info.estimated_liquidation_price).toFixed(2),
        };
        setOrderInfo(oi);
    }

    const hasEnoughBalance = useMemo(() => {
        let balance = wallet.getBalance();

        if (orderInfo.margin <= balance) {
            return true
        } else {
            return false
        }
    }, [wallet, orderInfo])

    const availableBalanceText = useMemo(() => {
        return `${wallet.getBalance()} Sats`;
    }, [wallet]);

    const isAPISocketConnected = useMemo(() => {
        return wsClientRef.current.isConnected;
    }, [wsClientRef.current.socket]);

    function navigateBackToDetails() {
        navigation.navigate('DerivativesTradingProductDetails', {
            key: `DerivativesTradingProductDetails-${product.symbol}`,
        });
    }

    function onOrderConfirmed() {
        let price = orderType === 'Market' ? (ticker.mid) : (limitPrice);
        let orderPrice = (price * Math.pow(10, product.priceDp)).toFixed(0);
        let order = {
            symbol: product.symbol,
            side,
            order_type: orderType,
            price: parseFloat(orderPrice),
            quantity,
            leverage: leverage * 100,
            ext_order_id: uuidV4(),
            margin_type: 'Isolated',
            settlement_type: 'Instant',
        };
        console.log('----------- SENDING ORDER -------------');
        console.log(order);
        wsClientRef.current.placeOrder(order);
        navigateBackToDetails();
    }

    function onOrderCancelled() {
        navigateBackToDetails();
    }

    return (
        <View>
            <ScrollView contentContainerStyle={styles.mainContentContainer}>
                <View style={styles.scrollingContentContainer}>
                    <View style={styles.mainHeader}>
                        <Text style={OrderReviewStyles.mainHeaderTitle}>Review</Text>
                    </View>

                    <View>
                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Wallet Balance:</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>{wallet.getBalance()} Sats</Text>
                        </View>

                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Quantity:</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>{quantity} Contracts</Text>
                        </View>
                        {
                            orderType === 'Market' ? (
                                <View style={OrderReviewStyles.breakdownItemGroup}>
                                    <Text style={OrderReviewStyles.breakdownItemLabel}>Market Price:</Text>
                                    <Text style={OrderReviewStyles.breakdownItemValue}>$ {ticker.mid.toFixed(2)}</Text>
                                </View>
                            ) : (
                                    <View style={OrderReviewStyles.breakdownItemGroup}>
                                        <Text style={OrderReviewStyles.breakdownItemLabel}>Limit Price:</Text>
                                        <Text style={OrderReviewStyles.breakdownItemValue}>$ {limitPrice.toFixed(2)}</Text>
                                    </View>
                                )
                        }
                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Est. Liquidation Price:</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>$ {orderInfo.liquidationPrice}</Text>
                        </View>

                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Order Value:</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>{orderInfo.value} Sats</Text>
                        </View>
                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Leverage</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>{leverage}x</Text>
                        </View>
                        <View style={OrderReviewStyles.breakdownItemGroup}>
                            <Text style={OrderReviewStyles.breakdownItemLabel}>Fees</Text>
                            <Text style={OrderReviewStyles.breakdownItemValue}>{orderInfo.fees}</Text>
                        </View>
                    </View>

                    <View style={styles.estimatedCostSection}>
                        {
                            !hasEnoughBalance && (
                                <Text style={styles.notEnoughFundsText}>Not enough available funds to make this trade!</Text>
                            )
                        }
                        <Text style={OrderReviewStyles.estimatedCostSectionHeading}>Cost @ {leverage}x Leverage:</Text>
                        <Text style={OrderReviewStyles.estimatedCostSectionValue}>{orderInfo.margin}</Text>
                    </View>
                </View>
            </ScrollView>

            <OrderReviewActionButtonFooter
                height={baseFooterHeight}
                onCancel={onOrderCancelled}
                onConfirm={onOrderConfirmed}
                canConfirm={isAPISocketConnected && hasEnoughBalance}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    navHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },

    notEnoughFundsText: {
        color: 'red',
    },

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
        paddingHorizontal: 10,
        minHeight: '100%',
        backgroundColor: 'black',
    },

    scrollingContentContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: 10,
        ...Platform.select({
            ios: {
                paddingBottom: baseFooterHeight + extraFooterOffset,
            },
            android: {
                paddingBottom: baseFooterHeight,
            },
        }),
    },

    mainHeader: {
        alignItems: 'center',
        marginBottom: 36,
    },

    estimatedCostSection: {
        marginTop: 28,
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
    },
});

DTOrderSummay.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        goBack: PropTypes.func,
        popToTop: PropTypes.func,
    }),
    route: PropTypes.shape({
        params: PropTypes.shape({
            wallet: PropTypes.object.isRequired,
            product: PropTypes.object.isRequired,
            quantity: PropTypes.number.isRequired,
            leverage: PropTypes.number.isRequired,
            wsClientRef: PropTypes.object.isRequired,
            side: PropTypes.string.isRequired,
            orderType: PropTypes.string.isRequired,
        }),
    }),
};

DTOrderSummay.defaultProps = {
    orderInfo: {
        value: 0,
        fees: 0,
        margin: 0,
        liquidationPrice: 0,
    }
}

DTOrderSummay.navigationOptions = ({
    route: {
        params: { product, side, orderType },
    },
}) => ({
    // ...BlueNavigationStyle(navigation, true),
    headerTitle: () => {
        if (side === 'Bid') {
            if (orderType === 'Limit') {
                return <Text style={styles.navHeaderTitle}>Limit Buy: {product.currencyPair}</Text>;
            } else {
                return <Text style={styles.navHeaderTitle}>Market Buy: {product.currencyPair}</Text>;
            }
        } else {
            if (orderType === 'Limit') {
                return <Text style={styles.navHeaderTitle}>Limit Sell: {product.currencyPair}</Text>;
            } else {
                return <Text style={styles.navHeaderTitle}>Market Sell: {product.currencyPair}</Text>;
            }
        }
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

export default DTOrderSummay;
