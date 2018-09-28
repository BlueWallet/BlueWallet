import React, { Component } from 'react';
import { View, ScrollView } from 'react-native';
import { BlueButton, SafeBlueArea, BlueCard, BlueText, BlueHeaderDefaultSub, BlueLoading, BlueSpacing20 } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function arrDiff(a1, a2) {
  let ret = [];
  for (let v of a2) {
    if (a1.indexOf(v) === -1) {
      ret.push(v);
    }
  }
  return ret;
}

function formatTime(time) {
  if (typeof time === 'string') {
    time = time.replace('T', ' ').replace('Z', '');
    time = time.split('.')[0];
  }
  return time;
}

export default class TransactionsDetails extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.transactions.details.title} onClose={() => navigation.goBack(null)} />;
    },
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <BlueCard>
            {(() => {
              if (BlueApp.tx_metadata[this.state.tx.hash]) {
                if (BlueApp.tx_metadata[this.state.tx.hash]['memo']) {
                  return (
                    <View>
                      <BlueText h4>{BlueApp.tx_metadata[this.state.tx.hash]['memo']}</BlueText>
                      <BlueSpacing20 />
                    </View>
                  );
                }
              }
            })()}

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>{loc.transactions.details.from}</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.from.filter(onlyUnique).join(', ')}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>{loc.transactions.details.to}</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>
              {arrDiff(this.state.from, this.state.to.filter(onlyUnique)).join(', ')}
            </BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Txid</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.hash}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Received</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{formatTime(this.state.tx.received)}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Confirmed</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{formatTime(this.state.tx.block_height)}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Confirmations</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.confirmations}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Inputs</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.inputs.length}</BlueText>

            <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Outputs</BlueText>
            <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.outputs.length}</BlueText>
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
        </ScrollView>
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
