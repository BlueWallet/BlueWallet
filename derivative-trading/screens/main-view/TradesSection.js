import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BlueLoading } from '../../../BlueComponents';
import RestApiClient from '../../class/RestApiClient';
import EmptyListSectionView from '../../components/EmptyListSectionView';
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
            setTrades(trades)
            setIsLoadingTrades(false);
        } catch (error) {
            setTrades([])
            setIsLoadingTrades(false);
        }
    }

    const SectionBody = () => {
        if (isLoadingTrades) {
            return <BlueLoading paddingTop={40} paddingBottom={40} />;
        } else if (trades.length === 0) {
            return <EmptyListSectionView height={80} message={"Your trades will appear here."} />;
        } else {
            return trades.slice(0).reverse().map((trade, index) => {
                let product = products.filter(product => product.symbol === trade.symbol);
                if (product.length > 0) {
                    return <TradesSectionListItem key={index} trade={trade} product={product[0]} ></TradesSectionListItem>
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
