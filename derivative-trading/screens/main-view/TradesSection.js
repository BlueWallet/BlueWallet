import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import loc from '../../../loc';
import EmptyListSectionView from '../../components/EmptyListSectionView';
import { BlueLoading } from '../../../BlueComponents';
import RestApiClient from '../../class/RestApiClient';
import TradesSectionListItem from './TradesSectionListItem';

const TradesSection = ({ style, apiKey, products }) => {
    const [isLoadingTrades, setIsLoadingTrades] = useState(false);
    const [trades, setTrades] = useState([]);

    useEffect(() => {
        updateTrades()
    }, [])

    async function updateTrades() {
        setIsLoadingTrades(true);
        let restClient = new RestApiClient({ apiKey });
        try {
            let trades = await restClient.fetchTrades({});
            console.log(trades)
            setTrades(trades)
            setIsLoadingTrades(false);
        } catch (error) {
            setTrades([])
            setIsLoadingTrades(false);
            console.log(error)
        }
    }

    const SectionBody = () => {
        if (isLoadingTrades) {
            return <BlueLoading paddingTop={40} paddingBottom={40} />;
        } else if (trades.length === 0) {
            return <EmptyListSectionView height={80} message={"Your trades will appear here."} />;
        } else {
            return trades.map((trade, index) => {
                console.log('-------------------------')
                console.log(trade)
                let product = products.filter(product => product.symbol === trade.symbol);
                if (product.length > 0) {
                    return <TradesSectionListItem trade={trade} product={product[0]} ></TradesSectionListItem>
                }
            });
        }
    };

    return (
        <View style={{ ...style }}>
            <SectionBody />
        </View>
    );
};

export default React.memo(TradesSection);
