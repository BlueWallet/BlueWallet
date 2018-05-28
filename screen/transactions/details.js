import React, { Component } from 'react';
import { View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueSpacing,
  BlueLoading,
  BlueSpacing20,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class TransactionsDetails extends Component {
  static navigationOptions = {
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-list-box' : 'ios-list-box-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  constructor(props) {
    super(props);
    let hash = props.navigation.state.params.hash;
    let foundTx = {};
    let from = [];
    let to = [];
    for (let tx of BlueApp.getTransactions()) {
      if (tx.hash === hash) {
        console.log(tx);
        foundTx = tx;
        for (let input of foundTx.inputs) {
          from = from.concat(input.addresses);
        }
        for (let output of foundTx.outputs) {
          to = to.concat(output.addresses);
        }
      }
    }

    this.state = {
      isLoading: true,
      tx: foundTx,
      from,
      to,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, paddingTop: 20 }}
      >
        <BlueSpacing />
        <BlueCard
          title={loc.transactions.details.title}
          style={{ alignItems: 'center', flex: 1 }}
        >
          {(() => {
            if (BlueApp.tx_metadata[this.state.tx.hash]) {
              if (BlueApp.tx_metadata[this.state.tx.hash]['memo']) {
                return (
                  <View>
                    <BlueText h4>
                      {BlueApp.tx_metadata[this.state.tx.hash]['memo']}
                    </BlueText>
                    <BlueSpacing20 />
                  </View>
                );
              }
            }
          })()}

          <BlueText h4>{loc.transactions.details.from}:</BlueText>
          <BlueText style={{ marginBottom: 10 }}>
            {this.state.from.join(', ')}
          </BlueText>

          <BlueText h4>{loc.transactions.details.to}:</BlueText>
          <BlueText style={{ marginBottom: 10 }}>
            {this.state.to.join(', ')}
          </BlueText>

          <BlueText>Txid: {this.state.tx.hash}</BlueText>
          <BlueText>received: {this.state.tx.received}</BlueText>
          <BlueText>confirmed: {this.state.tx.confirmed}</BlueText>
          <BlueText>confirmations: {this.state.tx.confirmations}</BlueText>
          <BlueText>inputs: {this.state.tx.inputs.length}</BlueText>
          <BlueText>outputs: {this.state.tx.outputs.length}</BlueText>

          <BlueText style={{ marginBottom: 10 }} />
        </BlueCard>

        {(() => {
          if (this.state.tx.confirmations === 0) {
            return (
              <BlueButton
                onPress={() =>
                  this.props.navigation.navigate('RBF', {
                    txid: this.state.tx.hash,
                  })
                }
                title="Replace-By-Fee (RBF)"
              />
            );
          }
        })()}
      </SafeBlueArea>
    );
  }
}

TransactionsDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        hash: PropTypes.string,
      }),
    }),
  }),
};
