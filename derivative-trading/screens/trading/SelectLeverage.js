import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import LeverageSelectionView from '../../components/trading-flow/LeverageSelectionView';

const DTSelectLeverage = ({
    navigation,
    route: {
        params: { wallet, product, wsClientRef, quantity, orderType, side, limitPrice, ticker, currentPosition, apiKey},
    },
}) => {
    // TODO: Use value from API when it its fractioning issue is fixed.
    // const maxLeverage = product.maxLeverage;
    const maxLeverage = product.maxLeverage;
    const [price, setPrice] = useState(null)

    useEffect(() => {
        if (orderType === 'Market') {
            setPrice(ticker);
        } else {
            setPrice(limitPrice);
        }
    }, [orderType]);

    function onLeverageSubmitted(leverage) {
        navigation.navigate('DTOrderSummary', {
            wallet,
            product,
            wsClientRef,
            quantity,
            leverage,
            orderType,
            side,
            limitPrice,
            currentPosition,
            apiKey,
        });
    }

    return <LeverageSelectionView style={styles.viewContainer} maxLeverage={maxLeverage} onLeverageSubmitted={onLeverageSubmitted} product={product} quantity={quantity} ticker={ticker}/>;
};

const styles = StyleSheet.create({
    navHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },

    viewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
});

DTSelectLeverage.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
        goBack: PropTypes.func,
    }),
    route: PropTypes.shape({
        params: PropTypes.shape({
            wallet: PropTypes.object.isRequired,
            product: PropTypes.object.isRequired,
            wsClientRef: PropTypes.object.isRequired,
            quantity: PropTypes.number.isRequired,
            side: PropTypes.string.isRequired,
            orderType: PropTypes.string.isRequired,
        }),
    }),
};

DTSelectLeverage.navigationOptions = ({
    navigation,
    route: {
        params: { product, side, orderType },
    },
}) => ({
    // ...BlueNavigationStyle(navigation, true),
    headerTitle: () => {
        if (side === 'Bid') {
            if (orderType === 'Market') {
                return <Text style={styles.navHeaderTitle}>Market Buy: {product.currencyPair}</Text>;
            } else {
                return <Text style={styles.navHeaderTitle}>Limit Buy: {product.currencyPair}</Text>;
            }
        } else {
            if (orderType === 'Market') {
                return <Text style={styles.navHeaderTitle}>Market Sell: {product.currencyPair}</Text>;
            } else {
                return <Text style={styles.navHeaderTitle}>Limit Sell: {product.currencyPair}</Text>;
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

export default DTSelectLeverage;
