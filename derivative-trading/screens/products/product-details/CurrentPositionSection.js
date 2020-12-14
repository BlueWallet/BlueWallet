import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text } from 'react-native';
import ListSectionStyles from '../../../class/styles/ListSectionStyles';
import DerivativesTradingPosition, { PositionSide } from '../../../models/Position';
import loc from '../../../../loc';
import PriceChart from '../../../components/PriceChart';
import { BlueCurrentTheme } from '../../../../components/themes';
import { BlueLoading } from '../../../../BlueComponents';

const CurrentPositionSection = ({ position, style, ticker, product}) => {
  const [uPNLChartData, setUPNLChartData] = useState([]);
  const [isFetchingUPNLChartData, setIsFetchingUPNLChartData] = useState(false);

  const sideDescriptionText = useMemo(() => {
    const sideText = position.side === PositionSide.BID ? 'Long' : 'Short';
    const entryPriceText = position.entryPrice;

    return `${sideText} @ $${entryPriceText}`;
  }, [position]);

  const sizeText = useMemo(() => {
    const suffix = position.quantity === 1 ? '' : 's';

    return `${position.quantity} Contract${suffix}`;
  }, [position]);

  const liqPriceText = useMemo(() => {
    const price = Number.parseFloat(position.liqPrice).toFixed(2);

    return `Liq. Price: $${price}`;
  }, [position]);

  const leverageText = useMemo(() => {
    return `Leverage: ${position.leverage}x`;
  }, [position]);

  const uPNLText = useMemo(() => {
    // let currentPrice = position.side === 'Bid'? ticker.bestBid: ticker.bestAsk;
    // let realUpnl = calculatePnl(position.entryPrice, currentPrice, position.quantity, position.side, product);
    // console.log(realUpnl);
    // if (realUpnl === undefined || !isFinite(realUpnl)) {
    //   realUpnl = 0;
    // }
    const textValue = Math.abs(Number.parseFloat(position.upnl).toFixed(0));
    const symbol = position.upnl === 0 ? '' : position.upnl > 0 ? '+' : '-';

    return `${symbol} ${textValue} Sats`;
  }, [position]);

  const uPNLTextColorStyle = useMemo(() => {
    if (position.upnl === 0) {
      return {color: BlueCurrentTheme.colors.tradingProfit};
    } else if (position.upnl > 0) {
      return { color: BlueCurrentTheme.colors.tradingProfit };
    } else if (position.upnl < 0) {
      return { color: BlueCurrentTheme.colors.tradingLoss };
    }
  }, [position]);

  useEffect(() => {
    fetchChartData();
  }, []);

  async function fetchChartData() {
    // setIsFetchingUPNLChartData(true);

    // const restAPIClient = new RestApiClient({ apiKey: restAPIKey });
    // const data = await restAPIClient.fetchUPNLHistoryForPosition(position, {
    //   granularity: '1d',
    //   start: '5w',
    // });

    // setUPNLChartData(convertToChartData(data));
    // setIsFetchingUPNLChartData(false);
  }

  const renderUPNLChartView = () => {
    if (isFetchingUPNLChartData) {
      return <BlueLoading paddingTop={40} paddingBottom={40} />;
      // } else if (uPNLChartData.length === 0) {
      // return <EmptyListSectionView height={80} message="No historical uPNL" />;
    } else {
      return <PriceChart data={uPNLChartData} height={88} />;
    }
  };

  return (
    <View style={{ ...style }}>
      <View style={[ListSectionStyles.header, styles.sectionHeader]}>
        <Text style={ListSectionStyles.headingTitle}>{loc.derivatives_trading.product_details.current_position}</Text>
      </View>

      <View style={styles.statsHeader}>
        <Text style={styles.sideDescriptionText}>{sideDescriptionText}</Text>
        <View style={styles.statsHeaderBottomRow}>
          <Text style={styles.statsHeaderBottomRowText}>{sizeText}</Text>
          <Text style={styles.statsHeaderBottomRowText}>{liqPriceText}</Text>
          <Text style={styles.statsHeaderBottomRowText}>{leverageText}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {/* <View style={styles.chartGraphicContainer}>{renderUPNLChartView()}</View> */}

        <View style={styles.chartFooterGroup}>
          <Text style={styles.uPNLHeading}>{loc.derivatives_trading.product_details.uPNL}</Text>
          <Text style={[styles.uPNLText, uPNLTextColorStyle]}>{uPNLText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    paddingBottom: 4,
  },

  statsHeader: {
    paddingHorizontal: 17,
    marginBottom: 5,
  },

  sideDescriptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'black'
  },

  statsHeaderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
  },

  statsHeaderBottomRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },

  chartFooterGroup: {
    marginTop: 6,
    alignItems: 'center',
  },

  uPNLHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white'
  },

  uPNLText: {
    fontSize: 24,
    fontWeight: '200',
  },
});

CurrentPositionSection.propTypes = {
  position: PropTypes.object.isRequired,
  restAPIKey: PropTypes.string.isRequired,
  style: PropTypes.object,
};

CurrentPositionSection.defaultProps = {
  style: {},
};

export default CurrentPositionSection;
