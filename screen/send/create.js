import React, { Component } from 'react';
import { TextInput, ScrollView, Linking, TouchableOpacity, Clipboard, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueNavigationStyle, SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
let loc = require('../../loc');

export default class SendCreate extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle,
    title: loc.send.create.details,
  });

  constructor(props) {
    super(props);
    console.log('send/create constructor');

    this.state = {
      isLoading: false,
      amount: props.navigation.getParam('amount'),
      fee: props.navigation.getParam('fee'),
      address: props.navigation.getParam('address'),
      memo: props.navigation.getParam('memo'),
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
    };
  }

  async componentDidMount() {
    console.log('send/create - componentDidMount');
    console.log('address = ', this.state.address);
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView>
            <BlueCard style={{ alignItems: 'center', flex: 1 }}>
              <BlueText style={{ color: '#0c2550', fontWeight: '500' }}>{loc.send.create.this_is_hex}</BlueText>
              <TextInput
                style={{
                  borderColor: '#ebebeb',
                  backgroundColor: '#d2f8d6',
                  borderRadius: 4,
                  marginTop: 20,
                  color: '#37c0a1',
                  fontWeight: '500',
                  fontSize: 14,
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  paddingTop: 16,
                }}
                height={72}
                multiline
                editable
                value={this.state.tx}
              />

              <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Clipboard.setString(this.state.tx)}>
                <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Copy and broadcast later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.tx)}>
                <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Verify on coinb.in</Text>
              </TouchableOpacity>
            </BlueCard>
            <BlueCard>
              <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.address}</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.amount}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.amount} BTC</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.fee}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.fee} BTC</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.tx_size}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.size} bytes</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.satoshi_per_byte}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.satoshiPerByte} Sat/B</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.memo}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.memo}</Text>
            </BlueCard>
          </ScrollView>
        </TouchableWithoutFeedback>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    color: '#0c2550',
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    color: '#9aa0aa',
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
});

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.number,
        address: PropTypes.string,
        memo: PropTypes.string,
      }),
    }),
  }),
};
