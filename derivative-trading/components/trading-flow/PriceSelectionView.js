import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TextInput, Text, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { BlueButton } from '../../../BlueComponents';
import { calculateOrderCostForProduct } from '../../class/OrderCalculationUtils';
import { useReachability } from 'react-native-watch-connectivity';

const PriceSelectionView = ({ onPriceSubmitted, style, product, leverage, quantity, ticker, side }) => {
  const [price, setPrice] = useState(1);
  const [priceFormatted, setPriceFormatted] = useState('$ 1')
  const [isPriceValid, setIsPriceValid] = useState(true);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    setIsPriceValid(price > 0);
    let cost = calculateOrderCostForProduct(product, quantity, price, leverage);
    setCost(cost)
  }, [price]);

  useEffect(() => {
    if (side === 'Bid') {
      setPrice(ticker.bestBid)
      setPriceFormatted('$ ' + ticker.bestBid.toString())
    } else {
      setPriceFormatted('$ ' + ticker.bestAsk.toString())
    }
  }, [ticker])

  const checkPriceIsValid = useMemo(() => {
    if (Number.isNaN(price)) {
      setIsPriceValid(false)
    } else {
      setIsPriceValid(true)
    }

  }, [price]);

  function onPriceTextChanged(newText) {
    setPrice(Number(newText.substring(1)))
    const newValue = parseFloat(newText.replace('$', ''));
    setPriceFormatted(newText)
  }

  function submitPrice() {
    onPriceSubmitted(price);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.mainView}>
        <View style={styles.mainValueContainer}>
          <Text style={styles.mainValueLabel}>Name Your Price</Text>
          <TextInput
            autoCorrect={false}
            value={priceFormatted}
            keyboardType="numeric"
            defaultValue={price}
            autoFocus
            style={styles.mainValueText}
            clearButtonMode={'never'}
            underlineColorAndroid="transparent"
            onChangeText={onPriceTextChanged}
            onSubmitEditing={submitPrice}
          />
        </View>
        <Text style={styles.costText}>Cost: {cost} Sats</Text>

        <KeyboardAvoidingView
          behavior={Platform.OS == "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.acceptButtonContainer}>
            <BlueButton title={!isPriceValid? "Price not valid": "Accept"} onPress={submitPrice} disabled={!isPriceValid} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({

  mainView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainValueContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: '25%'
  },

  keyboardView: {
    flex: 1,
  },

  costText: {
    textAlign: 'center',
    marginBottom: 20,
    color: 'white',
  },

  mainValueLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white'
  },

  mainValueText: {
    fontSize: 66,
    fontWeight: 'bold',
    color: 'white'
  },

  acceptButtonContainer: {
    alignSelf: 'center',
    marginBottom: 0,
    minWidth: '75%',
    maxWidth: 300,
    height: 50,
  },
});

PriceSelectionView.propTypes = {
  onPriceSubmitted: PropTypes.func.isRequired,
  style: PropTypes.object,
};

export default PriceSelectionView;
