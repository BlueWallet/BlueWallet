import React, { Component } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import {
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeaderDefaultSub,
  BlueLoading,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueNavigationStyle,
} from '../../BlueComponents';
import HandoffSettings from '../../class/handoff';
import Handoff from 'react-native-handoff';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const dayjs = require('dayjs');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  rowHeader: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  rowCaption: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowValue: {
    marginBottom: 26,
    color: 'grey',
  },
  txId: {
    fontSize: 16,
    fontWeight: '500',
  },
  txHash: {
    marginBottom: 8,
    color: 'grey',
  },
  txLink: {
    marginBottom: 26,
    color: '#2f5fb3',
  },
});

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
    let hash = props.route.params.hash;
    let foundTx = {};
    let from = [];
    let to = [];
    for (let tx of BlueApp.getTransactions()) {
      if (tx.hash === hash) {
        foundTx = tx;
        for (let input of foundTx.inputs) {
          from = from.concat(input.addresses);
        }
        for (let output of foundTx.outputs) {
          if (output.addresses) to = to.concat(output.addresses);
          if (output.scriptPubKey && output.scriptPubKey.addresses) to = to.concat(output.scriptPubKey.addresses);
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
      isHandOffUseEnabled: false,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    const isHandOffUseEnabled = await HandoffSettings.isHandoffUseEnabled();
    this.setState({
      isLoading: false,
      isHandOffUseEnabled,
    });
  }

  render() {
    if (this.state.isLoading || !this.state.hasOwnProperty('tx')) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        {this.state.isHandOffUseEnabled && (
          <Handoff
            title={`Bitcoin Transaction ${this.state.tx.hash}`}
            type="io.bluewallet.bluewallet"
            url={`https://blockstream.info/tx/${this.state.tx.hash}`}
          />
        )}
        <BlueHeaderDefaultSub leftText={loc.transactions.details.title} rightComponent={null} />
        <ScrollView style={styles.scroll}>
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

            {this.state.hasOwnProperty('from') && (
              <React.Fragment>
                <View style={styles.rowHeader}>
                  <BlueText style={styles.rowCaption}>{loc.transactions.details.from}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.from.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={styles.rowValue}>{this.state.from.filter(onlyUnique).join(', ')}</BlueText>
              </React.Fragment>
            )}

            {this.state.hasOwnProperty('to') && (
              <React.Fragment>
                <View style={styles.rowHeader}>
                  <BlueText style={styles.rowCaption}>{loc.transactions.details.to}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.to.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={styles.rowValue}>{arrDiff(this.state.from, this.state.to.filter(onlyUnique)).join(', ')}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('fee') && (
              <React.Fragment>
                <BlueText style={styles.rowCaption}>{loc.send.create.fee}</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.fee + ' sats'}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('hash') && (
              <React.Fragment>
                <View style={styles.rowHeader}>
                  <BlueText style={styles.txId}>Txid</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.tx.hash} />
                </View>
                <BlueText style={styles.txHash}>{this.state.tx.hash}</BlueText>
                <TouchableOpacity
                  onPress={() => {
                    const url = `https://blockstream.info/tx/${this.state.tx.hash}`;
                    Linking.canOpenURL(url).then(supported => {
                      if (supported) {
                        Linking.openURL(url);
                      }
                    });
                  }}
                >
                  <BlueText style={styles.txLink}>{loc.transactions.details.show_in_block_explorer}</BlueText>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('received') && (
              <React.Fragment>
                <BlueText style={styles.rowCaption}>Received</BlueText>
                <BlueText style={styles.rowValue}>{dayjs(this.state.tx.received).format('MM/DD/YYYY h:mm A')}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('block_height') && this.state.tx.block_height > 0 && (
              <React.Fragment>
                <BlueText style={styles.rowCaption}>Block Height</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.block_height}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('inputs') && (
              <React.Fragment>
                <BlueText style={styles.rowCaption}>Inputs</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.inputs.length}</BlueText>
              </React.Fragment>
            )}

            {this.state.tx.hasOwnProperty('outputs') && this.state.tx.outputs.length > 0 && (
              <React.Fragment>
                <BlueText style={styles.rowCaption}>Outputs</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.outputs.length}</BlueText>
              </React.Fragment>
            )}
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

TransactionsDetails.propTypes = {
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      hash: PropTypes.string,
    }),
  }),
};
