import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar, Icon, ListItem } from 'react-native-elements';
import { BlueCurrentTheme } from '../../../components/themes';
import { RestApiClient } from '../../class/RestApiClient';
import SparkLine from '../../components/SparkLine';

const AvailableProductListItem = ({ product, onPress, indexPriceHistory }) => {
  const [priceChange, setPriceChange] = useState(0);
  const [valueText, setValueText] = useState('');
  const [isPriceSelected, setIsPriceSelected] = useState(true);
  const [priceTicker, setPriceTicker] = useState({
    mid: 0.00,
    bestBid: 0.00,
    bestAsk: 0.00
  });

  const restApiClient = new RestApiClient();

  useEffect(() => {
    updateTicker();
  }, [])

  useEffect(() => {
    updatePrice()
  }, [priceTicker, isPriceSelected]);

  function updatePrice() {
    let priceChange = computePriceChange();
    if (isPriceSelected) {
      setPriceChange(priceChange);
      setValueText(`\$${priceTicker.mid.toFixed(2)}`)
    }
    else {
      setPriceChange(priceChange);
      if (priceChange >= 0) {
        setValueText(`+${priceChange}%`)
      } else {
        setValueText(`${priceChange}%`)
      }
    }

  }

  async function updateTicker() {
    let ticker = await restApiClient.fetchTicker({ symbol: product.symbol });
    setPriceTicker(ticker)
  }

  function computePriceChange() {
    if (indexPriceHistory.length < 2) {
      return 0;
    }
    const startingPrice = indexPriceHistory[0].mean;
    const endingPrice = indexPriceHistory[indexPriceHistory.length - 1].mean;
    return (((endingPrice - startingPrice) / startingPrice) * 100).toFixed(2);
  }


  function onPriceIconTouch() {
    if (isPriceSelected) {
      setIsPriceSelected(false);
    } else {
      setIsPriceSelected(true);
    }
  }

  const ItemTitel = () => {
    let first = product.symbol.substring(0, 3)
    let second = product.symbol.substring(3, 6)
    return (
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ color: 'white' }}>{first}</Text>
        <Icon
          reverse
          name='dot-single'
          type='entypo'
          color='white'
          size={1}
        />
        <Text style={{ color: 'white' }}>{second}</Text>
      </View>
    )
  }

  return (
    <ListItem
      pad={10}
      containerStyle={[{ backgroundColor: 'black', borderBottomColor: '#2e2d2d' }]}
      onPress={onPress}
      bottomDivider
    >
      <Avatar source={product.avatarImage} size={23} />
      <ListItem.Title style={styles.titleStyle}>
        <ItemTitel />
      </ListItem.Title>
      <ListItem.Content style={{width: '100%'}}>
        <View style={styles.rightElementContainer}>
          <View style={styles.chartContainer}>
            {priceChange > 0 ? (
              <SparkLine data={indexPriceHistory} color={styles.positive.color} />
            ) : (
                <SparkLine data={indexPriceHistory} color={styles.negative.color} />
              )}
          </View>
          <View style={styles.changeSummaryContainer}>
            <TouchableOpacity onPress={onPriceIconTouch}>
              <View style={styles.iconAndAmountContainer} backgroundColor={priceChange > 0 ? 'rgb(0, 204, 102)' : 'rgb(189, 44, 30)'}>
                <Text style={[styles.priceChangeText]}>{valueText}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );
};

const styles = StyleSheet.create({
  titleText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    marginRight: 20
  },

  rightElementContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
    right: '25%'
  },

  chartContainer: {
    left: -30,
  },

  positive: {
    color: 'green',
    textAlign: 'center',
    width: '100%'
  },

  negative: {
    color: 'red',
    textAlign: 'center',
    width: '100%'
  },

  priceChangeText: {
    color: 'white',
    textAlign: 'center',
    width: '100%',
    fontSize: 12,
  },

  changeSummaryLabel: {
    paddingBottom: 4,
    color: 'gray',
  },

  iconAndAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: 100,
    backgroundColor: 'black',
    width: 70,
    height: 25
  },

  intervalChangeIcon: {
    marginRight: 4,
  },

  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: BlueCurrentTheme.colors.tradingProfit,
  },
});

AvailableProductListItem.propTypes = {
  product: PropTypes.object.isRequired,
  onPress: PropTypes.func,
  indexPriceHistory: PropTypes.arrayOf(PropTypes.object),
};

AvailableProductListItem.defaultProps = {
  onPress: () => { },
  indexPriceHistory: [],
};

export default AvailableProductListItem;
