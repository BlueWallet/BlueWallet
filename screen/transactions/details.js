import React, { Component } from 'react';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeaderDefaultSub,
  BlueLoading,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueNavigationStyle,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const dayjs = require('dayjs');

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

export default class TransactionsDetails extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
  });

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

    let wallet = false;
    for (let w of BlueApp.getWallets()) {
      for (let t of w.getTransactions()) {
        if (t.hash === hash) {
          console.log('tx', hash, 'belongs to', w.getLabel());
          wallet = w;
        }
      }
    }
    this.state = {
      isLoading: true,
      tx: foundTx,
      from,
      to,
      wallet,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading || !this.state.hasOwnProperty('tx')) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeaderDefaultSub leftText={loc.transactions.details.title} rightComponent={null} />
        <ScrollView style={{ flex: 1 }}>
          <BlueCard>
            {(() => {
              if (this.state.tx.confirmations === 0 && this.state.wallet && this.state.wallet.allowRBF()) {
                return (
                  <React.Fragment>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('RBF', {
                          txid: this.state.tx.hash,
                        })
                      }
                      title="Replace-By-Fee (RBF)"
                    />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              }
            })()}

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

            {this.state.hasOwnProperty('from') && (
              <React.Fragment>
                <View style={{ flex: 1, flexDirection: 'row', marginBottom: 4, justifyContent: 'space-between' }}>
                  <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>{loc.transactions.details.from}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.from.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.from.filter(onlyUnique).join(', ')}</BlueText>
              </React.Fragment>
            )}

            {this.state.hasOwnProperty('to') && (
              <React.Fragment>
                <View style={{ flex: 1, flexDirection: 'row', marginBottom: 4, justifyContent: 'space-between' }}>
                  <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>{loc.transactions.details.to}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.to.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>
                  {arrDiff(this.state.from, this.state.to.filter(onlyUnique)).join(', ')}
                </BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('fee') && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>{loc.send.create.fee}</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.fee + ' sats'}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('hash') && (
              <React.Fragment>
                <View style={{ flex: 1, flexDirection: 'row', marginBottom: 4, justifyContent: 'space-between' }}>
                  <BlueText style={{ fontSize: 16, fontWeight: '500' }}>Txid</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.tx.hash} />
                </View>
                <BlueText style={{ marginBottom: 8, color: 'grey' }}>{this.state.tx.hash}</BlueText>
                <TouchableOpacity
                  onPress={() => {
                    const url = `https://live.blockcypher.com/btc/tx/${this.state.tx.hash}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      }
                    });
                  }}
                >
                  <BlueText style={{ marginBottom: 26, color: '#2f5fb3' }}>{loc.transactions.details.show_in_block_explorer}</BlueText>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('received') && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Received</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{dayjs(this.state.tx.received).format('MM/DD/YYYY h:mm A')}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('block_height') && this.state.tx.block_height > 0 && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Block Height</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.block_height}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('confirmations') && this.state.tx.confirmations > 0 && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Confirmations</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.confirmations}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('inputs') && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Inputs</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.inputs.length}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('outputs') && this.state.tx.outputs.length > 0 && (
              <React.Fragment>
                <BlueText style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>Outputs</BlueText>
                <BlueText style={{ marginBottom: 26, color: 'grey' }}>{this.state.tx.outputs.length}</BlueText>
              </React.Fragment>
            )}
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

TransactionsDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        hash: PropTypes.string,
      }),
    }),
  }),
};
