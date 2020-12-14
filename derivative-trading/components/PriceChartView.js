import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatCurrencyValue } from '../class/Utils';
import PriceChart from './PriceChart';


const PriceChartView = ({ data, ticker, product }) => {

    const [cursorValue, setCursorValue] = useState(0);
    const [isCursorActive, setIsCursorActive] = useState(false);
    const [cursorInteractCounter, setCoursorInteractCounter] = useState(0);

    function onCursorChange(data) {
        let value = data.toFixed(product.priceDp);
        setCursorValue(value)
    }

    function onCursorRelease(isReleased, data) {
        let c = cursorInteractCounter;
        c += 1;
        setCoursorInteractCounter(c);
        // This is a bit fucked.
        if (c < 2) {
            return;
        }
        setIsCursorActive(!isReleased);
        if (isReleased) {
            setCursorValue(ticker);
        }

    }

    const Ticker = ({ ticker }) => {
        return (
            <View style={styles.mainTicker}>
                <Text style={styles.mainTickerMidPrice}>
                    <Text style={styles.currencySymbol}>$ </Text>
                    {
                        isCursorActive ? (
                            formatCurrencyValue(cursorValue)
                        ) : (
                                formatCurrencyValue(ticker.mid.toFixed(product.priceDp))
                            )
                    }
                </Text>
                <View>
                    <Text style={styles.mainTickerBidAskPrice}>
                        <Text style={styles.bidPriceText}>Buy
          <Text style={styles.bidPriceTextValue}> {ticker.bestBid.toFixed(product.priceDp)}</Text>
                        </Text>
                        <Text style={styles.spreadDivider}>  /  </Text>
                        <Text style={styles.askPriceText}>Sell
            <Text style={styles.askPriceTextValue}> {ticker.bestAsk.toFixed(product.priceDp)}</Text>
                        </Text>
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View>
            <Ticker ticker={ticker} />
            <PriceChart data={data} height={350} onCursorChange={onCursorChange} onCursorRelease={onCursorRelease} />
        </View>
    )
}

const styles = StyleSheet.create({
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
        textAlign: 'left',
        width: '100%',
        color: 'white',
    },

    mainTickerMidPrice: {
        textAlign: 'left',
        fontSize: 42,
        color: 'white',
    },

    mainTickerBidAskPrice: {
        textAlign: 'left',
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

})

export default PriceChartView;