import React, { Component } from 'react';
import LottieView from 'lottie-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
let loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  amout: {
    alignItems: 'center',
    flex: 1,
  },
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 76,
    paddingBottom: 16,
  },
  amountValue: {
    color: '#0f5cc0',
    fontSize: 36,
    fontWeight: '600',
  },
  amountUnit: {
    color: '#0f5cc0',
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  feeText: {
    color: '#37c0a1',
    fontSize: 14,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 43,
    marginBottom: 53,
  },
});

export default class Success extends Component {
  static navigationOptions = {
    headerShown: false,
    gesturesEnabled: false,
  };

  constructor(props) {
    super(props);
    console.log('send/success constructor');

    this.state = {
      amount: props.route.params.amount,
      fee: props.route.params.fee || 0,
      amountUnit: props.route.params.amountUnit || BitcoinUnit.BTC,
      invoiceDescription: props.route.params.invoiceDescription || '',
    };
  }

  async componentDidMount() {
    console.log('send/success - componentDidMount');
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
  }

  render() {
    return (
      <SafeBlueArea style={styles.root}>
        <BlueCard style={styles.amout}>
          <View style={styles.view}>
            <Text style={styles.amountValue}>{this.state.amount}</Text>
            <Text style={styles.amountUnit}>{' ' + this.state.amountUnit}</Text>
          </View>
          {this.state.fee > 0 && (
            <Text style={styles.feeText}>
              {loc.send.create.fee}: {this.state.fee} {BitcoinUnit.BTC}
            </Text>
          )}
          {this.state.fee <= 0 && (
            <Text numberOfLines={0} style={styles.feeText}>
              {this.state.invoiceDescription}
            </Text>
          )}
        </BlueCard>
        <View style={styles.ready}>
          <LottieView style={{ width: 400, height: 400 }} source={require('../../img/bluenice.json')} autoPlay loop={false} />
        </View>
        <BlueCard>
          <BlueButton
            onPress={() => {
              this.props.navigation.dangerouslyGetParent().pop();
            }}
            title={loc.send.success.done}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Success.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        fee: PropTypes.number,
      }),
    }),
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};
