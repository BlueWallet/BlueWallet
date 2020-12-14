import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { BlueButton } from '../../../BlueComponents';
import { Slider } from 'react-native-elements';
import { BlueCurrentTheme } from '../../../components/themes';
import { calculateOrderCostForProduct } from '../../class/OrderCalculationUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

const LeverageSelectionView = ({ product, minLeverage, maxLeverage, onLeverageSubmitted, style, quantity, ticker}) => {
  const [leverage, setLeverage] = useState(1);
  const [orderCost, setOrderCost] = useState(1);

  function submitLeverage() {
    onLeverageSubmitted(leverage);
  }

  function onLeverageSliderChanged(value) {
    setLeverage(Number(value));
  }

  useEffect(() => {
    let cost = calculateOrderCostForProduct(product, quantity, ticker.mid, leverage);
    setOrderCost(cost);
  }, [leverage, ticker])

  return (
    <View style={style}>
      <View style={styles.mainValueContainer}>
        <Text style={styles.mainValueLabel}>Leverage</Text>
        <Text style={styles.mainValueText}>{leverage}x</Text>

        <View style={styles.leverageSelectionContainer}>
          <View style={styles.leverageSliderRow}>
            <Text style={styles.leverageSliderLabelText}>1x</Text>
            <Slider
              style={styles.leverageSlider}
              value={leverage}
              minimumValue={minLeverage}
              maximumValue={maxLeverage}
              step={1}
              minimumTrackTintColor={BlueCurrentTheme.colors.outputValue}
              maximumTrackTintColor="#d8d8d8"
              trackStyle={styles.leverageTrack}
              thumbStyle={styles.leverageThumb}
              onValueChange={onLeverageSliderChanged}
            />
            <Text style={styles.leverageSliderLabelText}>{maxLeverage}x</Text>
          </View>
          <View>
            <Text style={styles.costText}>Cost: {orderCost} Sats</Text>
          </View>
        </View>
      </View>

      <View style={styles.acceptButtonContainer}>
        <BlueButton title="Accept" onPress={submitLeverage} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainValueContainer: {
    marginTop: 'auto',
    alignItems: 'center',
  },

  costText: {
    width: '100%',
    marginTop: 16,
    textAlign: 'center',
    color: 'white',
  },

  leverageSelectionContainer: {
    marginTop: 30,
    maxWidth: 500,
    width: SCREEN_WIDTH * 0.8,
  },

  mainValueLabel: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },

  mainValueText: {
    fontSize: 88,
    fontWeight: 'bold',
    color: 'white',
  },

  leverageSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  leverageSliderLabelText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },

  leverageSlider: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    marginHorizontal: 10,
    shadowColor: 'red',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  leverageTrack: {
    height: 8,
    borderRadius: 99,
    shadowColor: 'red',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  leverageThumb: {
    height: 35,
    width: 35,
    borderRadius: 1000,
    shadowColor: 'red',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
  },

  acceptButtonContainer: {
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 32,
    minWidth: '75%',
    maxWidth: 300,
  },
});

LeverageSelectionView.propTypes = {
  minLeverage: PropTypes.number,
  maxLeverage: PropTypes.number,
  onLeverageSubmitted: PropTypes.func.isRequired,
  style: PropTypes.object,
};

LeverageSelectionView.defaultProps = {
  minLeverage: 1,
  maxLeverage: 100,
};

export default LeverageSelectionView;
