import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from 'react-native-modal';
import DerivativesTradingProduct from '../../models/Product';
import { OrderType } from '../../models/TradingTypes';
import QuantitySelectionView from '../../components/trading-flow/QuantitySelectionView';
import OrderTypeSelectionModal from '../../components/trading-flow/OrderTypeSelectionModal';
import OrderTypeSelectButton from '../../components/trading-flow/OrderTypeSelectButton';

const DTSelectQuantity = ({
    navigation,
    route: {
        params: { wallet, product, wsClientRef, side, orderType, limitPrice, ticker, currentPosition, apiKey },
    },
}) => {
    // https://stackoverflow.com/a/48759750/8859365
    const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : null;
    const leverage = 1;
    const [isShowingOrderTypeSelectionModal, setIsShowingOrderTypeSelectionModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    function onQuantitySubmitted(quantity) {
        setQuantity(quantity);
        navigation.navigate('DTSelectLeverage', {
            wallet,
            product,
            wsClientRef,
            quantity,
            orderType,
            side,
            limitPrice,
            ticker,
            currentPosition,
            apiKey,
        });
    }

    function onOrderTypeSelected(orderType) {
        closeOrderTypeSelectionModal();
        if (orderType === OrderType.LIMIT) {
            navigation.navigate('DTTradingRoot', {
                screen: 'DTSelectLimitPrice',
                key: `DTSelectLimitPrice-${product.symbol}`,
                params: {
                    wallet,
                    product,
                    wsClientRef,
                    side,
                    limitPrice,
                    leverage,
                    ticker,
                    orderType,
                    quantity,
                    apiKey,
                },
            });
        } else {
            navigation.navigate('DTTradingRoot', {
                screen: 'DTSelectQuantity',
                key: `DTSelectQuantity-${product.symbol}`,
                params: {
                    wallet,
                    product,
                    wsClientRef,
                    side,
                    orderType: 'Market',
                    limitPrice,
                    currentPosition,
                    apiKey,
                },
            });
        }

    }

    function showOrderTypeSelectionModal() {
        setIsShowingOrderTypeSelectionModal(true);
    }

    function closeOrderTypeSelectionModal() {
        setIsShowingOrderTypeSelectionModal(false);
    }

    return (
        <KeyboardAvoidingView style={styles.viewContainer} behavior={keyboardBehavior}>
            <View style={styles.headerRow}>
                <OrderTypeSelectButton
                    title={orderType}
                    containerStyle={styles.orderTypeSelectionButtonContainer}
                    buttonStyle={styles.orderTypeSelectionButton}
                    onPress={showOrderTypeSelectionModal}
                />
            </View>
            {/* <Text>{ticker.mid}</Text> */}
            <QuantitySelectionView style={styles.quantitySelectionView} onQuantitySubmitted={onQuantitySubmitted}
                ticker={ticker} product={product} leverage={leverage} limitPrice={limitPrice} orderType={orderType} />
            <Modal
                isVisible={isShowingOrderTypeSelectionModal}
                style={styles.bottomModal}
                onBackdropPress={closeOrderTypeSelectionModal}
                animationIn="bounceInUp"
            >
                <OrderTypeSelectionModal onOrderTypeSelected={onOrderTypeSelected} />
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    navHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },

    viewContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'black',
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 'auto',
        paddingHorizontal: 24,
        paddingTop: 0,
    },

    quantitySelectionView: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'space-between',
    },

    orderTypeSelectionButtonContainer: {
        marginLeft: 'auto',
        flexBasis: '39%',
    },

    orderTypeSelectionButton: {
        maxWidth: 200,
        minWidth: 88,
        borderRadius: 24,
    },

    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
});

DTSelectQuantity.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        goBack: PropTypes.func,
    }),
    route: PropTypes.shape({
        params: PropTypes.shape({
            wallet: PropTypes.object.isRequired,
            product: PropTypes.object.isRequired,
            wsClientRef: PropTypes.object.isRequired,
            side: PropTypes.string.isRequired,
            orderType: PropTypes.string.isRequired,
            ticker: PropTypes.number.isRequired,
        }),
    }),
};

DTSelectQuantity.navigationOptions = ({
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

export default DTSelectQuantity;
