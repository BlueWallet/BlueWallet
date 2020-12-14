import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from 'react-native-modal';
import DerivativesTradingProduct from '../../models/Product';
import { OrderType } from '../../models/TradingTypes';
import OrderTypeSelectionModal from '../../components/trading-flow/OrderTypeSelectionModal';
import OrderTypeSelectButton from '../../components/trading-flow/OrderTypeSelectButton';
import PriceSelectionView from '../../components/trading-flow/PriceSelectionView';


const DTSelectLimitPrice = ({
    navigation,
    route: {
        params: { wallet, product, wsClientRef, side, ticker, leverage, quantity, apiKey },
    },
}) => {
    // https://stackoverflow.com/a/48759750/8859365
    const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : null;
    const [isShowingOrderTypeSelectionModal, setIsShowingOrderTypeSelectionModal] = useState(false);

    function onPriceSubmitted(limitPrice) {
        navigation.navigate('DTSelectQuantity', {
            wallet,
            product,
            wsClientRef,
            limitPrice,
            orderType: 'Limit',
            ticker,
            side,
        });
    }

    function onOrderTypeSelected(orderType) {
        closeOrderTypeSelectionModal();

        if (orderType === OrderType.MARKET) {
            navigation.navigate('DTTradingRoot', {
                screen: 'DTSelectQuantity',
                params: {
                    key: `DTSelectQuantity-${product.symbol}`,
                    wallet,
                    product,
                    wsClientRef,
                    side,
                    orderType: 'Market',
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
                    title={OrderType.LIMIT}
                    containerStyle={styles.orderTypeSelectionButtonContainer}
                    buttonStyle={styles.orderTypeSelectionButton}
                    onPress={showOrderTypeSelectionModal}
                />
            </View>

            <PriceSelectionView style={styles.priceSelectionView} side={side} onPriceSubmitted={onPriceSubmitted} product={product} leverage={leverage} quantity={quantity} ticker={ticker}/>
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
        backgroundColor: 'black'
    },

    mainValueContainer: {
        alignSelf: 'center',
        marginTop: 'auto',
        alignItems: 'center',
    },

    mainValueLabel: {
        fontSize: 48,
        fontWeight: 'bold',
    },

    mainValueText: {
        marginTop: 20,
        fontSize: 42,
        fontWeight: 'bold',
        color: 'white',
    },

    acceptButtonContainer: {
        alignSelf: 'center',
        marginTop: 'auto',
        marginBottom: 32,
        minWidth: '75%',
        maxWidth: 300,
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

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 'auto',
        paddingHorizontal: 24,
        paddingTop: 32,
    },

    priceSelectionView: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'space-between',
    },

    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
});

DTSelectLimitPrice.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        goBack: PropTypes.func,
    }),
    route: PropTypes.shape({
        params: PropTypes.shape({
            wallet: PropTypes.object.isRequired,
            product: PropTypes.object.isRequired,
            wsClientRef: PropTypes.object.isRequired,
        }),
    }),
};

DTSelectLimitPrice.navigationOptions = ({
    route: {
        params: { product, side },
    },
}) => ({
    // ...BlueNavigationStyle(navigation, true),
    headerTitle: () => {
        if (side === 'Bid') {
            return <Text style={styles.navHeaderTitle}>Limit Buy: {product.currencyPair}</Text>;
        } else {
            return <Text style={styles.navHeaderTitle}>Limit Sell: {product.currencyPair}</Text>;
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

export default DTSelectLimitPrice;
