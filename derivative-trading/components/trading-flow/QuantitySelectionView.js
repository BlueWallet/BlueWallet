import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { BlueButton } from '../../../BlueComponents';
import { calculateOrderCostForProduct } from '../../class/OrderCalculationUtils';


const QuantitySelectionView = ({ onQuantitySubmitted, product, ticker, orderType, leverage, limitPrice }) => {
  const [quantity, setQuantity] = useState(1);
  const [isQuantityValid, setIsQuantityValid] = useState(true);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    setIsQuantityValid(quantity > 0);
    let price = orderType === 'Market' ? (ticker.mid) : (limitPrice);
    let cost = calculateOrderCostForProduct(product, quantity, price, leverage);
    setCost(cost)
  }, [quantity, orderType]);

  function submitQuantity() {
    onQuantitySubmitted(quantity);
  }

  const formattedQuantityText = useMemo(() => {
    let text = quantity.toString().replace(/[^0-9]/g, '');
    return text;
  }, [quantity]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.mainView}>
        <View style={styles.mainValueContainer}>
          <Text style={styles.mainValueLabel}>Quantity</Text>
          <TextInput
            autoCorrect={false}
            value={formattedQuantityText}
            keyboardType="numeric"
            autoFocus
            style={styles.mainValueText}
            clearButtonMode="never"
            underlineColorAndroid="transparent"
            onChangeText={text => setQuantity(Number(text))}
            onSubmitEditing={submitQuantity}
          />
        </View>
        <Text style={styles.costText}>Cost: {cost} Sats</Text>
        <KeyboardAvoidingView
          behavior={Platform.OS == "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.acceptButtonContainer}>
            <BlueButton title="Accept" onPress={submitQuantity} disabled={!isQuantityValid} />
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
    marginTop: '25%',
    //marginBottom: 30,
  },

  keyboardView: {
    flex: 1,
  },

  mainValueLabel: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },

  costText: {
    textAlign: 'center',
    marginBottom: 20,
    color: 'white',
  },

  mainValueText: {
    fontSize: 88,
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

QuantitySelectionView.propTypes = {
  onQuantitySubmitted: PropTypes.func.isRequired,
  product: PropTypes.object.isRequired
};

export default QuantitySelectionView;
