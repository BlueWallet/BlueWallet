import React, { Component } from 'react';
import { View, ActivityIndicator, ScrollView, TouchableOpacity, Linking } from 'react-native';
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
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const dayjs = require('dayjs');

const buttonStatus = Object.freeze({
  possible: 1,
  unknown: 2,
  notPossible: 3,
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
    let hash = props.navigation.state.params.hash;
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
      isCPFPpossible: buttonStatus.unknown,
      isRBFBumpFeePossible: buttonStatus.unknown,
      isRBFCancelPossible: buttonStatus.unknown,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    this.setState({
      isLoading: false,
    });

    try {
      await this.checkPossibilityOfCPFP();
      await this.checkPossibilityOfRBFBumpFee();
      await this.checkPossibilityOfRBFCancel();
    } catch (_) {
      this.setState({
        isCPFPpossible: buttonStatus.notPossible,
        isRBFBumpFeePossible: buttonStatus.notPossible,
        isRBFCancelPossible: buttonStatus.notPossible,
      });
    }
  }

  async checkPossibilityOfCPFP() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ isCPFPpossible: buttonStatus.notPossible });
    }

    let tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if ((await tx.isToUsTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0) {
      return this.setState({ isCPFPpossible: buttonStatus.possible });
    } else {
      return this.setState({ isCPFPpossible: buttonStatus.notPossible });
    }
  }

  async checkPossibilityOfRBFBumpFee() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.notPossible });
    }

    let tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if ((await tx.isOurTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0 && (await tx.isSequenceReplaceable())) {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.possible });
    } else {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.notPossible });
    }
  }

  async checkPossibilityOfRBFCancel() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ isRBFCancelPossible: buttonStatus.notPossible });
    }

    let tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if (
      (await tx.isOurTransaction()) &&
      (await tx.getRemoteConfirmationsNum()) === 0 &&
      (await tx.isSequenceReplaceable()) &&
      (await tx.canCancelTx())
    ) {
      return this.setState({ isRBFCancelPossible: buttonStatus.possible });
    } else {
      return this.setState({ isRBFCancelPossible: buttonStatus.notPossible });
    }
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
              if (this.state.isCPFPpossible === buttonStatus.unknown) {
                return (
                  <React.Fragment>
                    <ActivityIndicator />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              } else if (this.state.isCPFPpossible === buttonStatus.possible) {
                return (
                  <React.Fragment>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('CPFP', {
                          txid: this.state.tx.hash,
                          wallet: this.state.wallet,
                        })
                      }
                      title="Bump fee (CPFP)"
                    />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              }
            })()}

            {(() => {
              if (this.state.isRBFBumpFeePossible === buttonStatus.unknown) {
                return (
                  <React.Fragment>
                    <ActivityIndicator />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              } else if (this.state.isRBFBumpFeePossible === buttonStatus.possible) {
                return (
                  <React.Fragment>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('RBFBumpFee', {
                          txid: this.state.tx.hash,
                          wallet: this.state.wallet,
                        })
                      }
                      title="Bump fee (RBF)"
                    />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              }
            })()}

            {(() => {
              if (this.state.isRBFCancelPossible === buttonStatus.unknown) {
                return (
                  <React.Fragment>
                    <ActivityIndicator />
                    <BlueSpacing20 />
                  </React.Fragment>
                );
              } else if (this.state.isRBFCancelPossible === buttonStatus.possible) {
                return (
                  <React.Fragment>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('RBFCancel', {
                          txid: this.state.tx.hash,
                          wallet: this.state.wallet,
                        })
                      }
                      title="Cancel this transaction (RBF)"
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
                    const url = `https://blockstream.info/tx/${this.state.tx.hash}`;
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
