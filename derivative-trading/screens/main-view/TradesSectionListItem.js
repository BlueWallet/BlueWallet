import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import TradingDataStyles from '../../class/styles/TradingDataStyles';
import { BlueHSpacing20 } from '../../../BlueComponents';
import { BlueCurrentTheme } from '../../../components/themes';
import CurrencyPairAvatar from '../../components/CurrencyPairAvatar';
import LeverageBadge from '../../components/LeverageBadge';
import DerivativesTradingOpenedOrder from '../../models/OpenedOrder';
import { PositionSide } from '../../models/Position';
import { calculateOrderCostForProduct } from '../../class/OrderCalculationUtils';
import { bankerRound, priceToDollars } from '../../class/Utils';

const TradesSectionListItem = ({ trade, product }) => {
    console.log('2919291929129219192191291291291291')
    console.log(trade)
    console.log(product)

    const subtitleStyles = useMemo(() => {
        const colorName = trade.side === PositionSide.BID ? 'tradingProfit' : 'tradingLoss';
        return {
            ...styles.subtitleText,
            color: BlueCurrentTheme.colors[colorName],
        };
    }, [trade.isPartial]);

    const subtitleText = useMemo(() => {
        const sideText = trade.side === PositionSide.BID ? 'Buy' : 'Sell';
        return `${sideText}`;
    }, [trade.isPartial]);

    const price = priceToDollars(trade.price, product);

    return (
        <ListItem containerStyle={{backgroundColor: 'black'}}>
            <Avatar source={product.avatarImage} />
            <ListItem.Title>
                <View style={styles.titleGroup}>
                    <View style={styles.mainTitleRow}>
                        <Text style={styles.titleText}>{trade.currencyPair}</Text>
                        <LeverageBadge style={styles.leverageBadge} leverage={trade.leverage / 100} />
                    </View>

                    <Text style={styles.titleMarginTypeText}>({trade.settlementType})</Text>
                    <Text style={subtitleStyles}>{subtitleText}</Text>
                </View>
            </ListItem.Title>
            <ListItem.Content style={styles.listItemContainer}>
                <View style={styles.dataGroupItems}>
                    <View style={styles.dataGroupItems}>
                        <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
                            <Text style={TradingDataStyles.dataItemLabel}>Quantity</Text>
                            <Text style={TradingDataStyles.dataItemValue}>{trade.quantity}</Text>
                        </View>

                        <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
                            <Text style={TradingDataStyles.dataItemLabel}>Price</Text>
                            <Text style={TradingDataStyles.dataItemValue}>{`$ ${price}`}</Text>
                        </View>

                        <View style={[TradingDataStyles.labeledDataVGroup, styles.dataGroupItem]}>
                            <Text style={TradingDataStyles.dataItemLabel}>Remaining</Text>
                            <Text style={TradingDataStyles.dataItemValue}>{trade.remaining}</Text>
                        </View>
                    </View>
                </View>
            </ListItem.Content>
        </ListItem>
    );
};

const styles = StyleSheet.create({
    listItemContainer: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        width: '100%',
        paddingVertical: 10,
        backgroundColor: 'black'
    },

    titleGroup: {
        backgroundColor: 'black',
    },
    leftElementContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        flex: 0,
        // backgroundColor: 'purple',
        marginRight: 24,
    },

    rightElementContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        flex: 1,
        // backgroundColor: 'red',
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
        left: -5,
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
        backgroundColor: 'black',
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 10,
    },

    dataGroupItem: {
        marginLeft: 10
    },
});

TradesSectionListItem.propTypes = {
};

TradesSectionListItem.defaultProps = {
};

export default TradesSectionListItem;