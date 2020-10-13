/* global alert */
import React, { Component } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, Linking, StatusBar, StyleSheet } from 'react-native';
import {
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueLoading,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueNavigationStyle,
} from '../../BlueComponents';
import HandoffSettings from '../../class/handoff';
import Handoff from 'react-native-handoff';
import PropTypes from 'prop-types';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
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
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  rowValue: {
    marginBottom: 26,
    color: 'grey',
  },
  txId: {
    fontSize: 16,
    fontWeight: '500',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  txHash: {
    marginBottom: 8,
    color: 'grey',
  },
  txLink: {
    marginBottom: 26,
    color: BlueCurrentTheme.colors.alternativeTextColor2,
  },
  save: {
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: BlueCurrentTheme.colors.alternativeTextColor2,
  },
  memoTextInput: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
});

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function arrDiff(a1, a2) {
  const ret = [];
  for (const v of a2) {
    if (a1.indexOf(v) === -1) {
      ret.push(v);
    }
  }
  return ret;
}

export default class TransactionsDetails extends Component {
  constructor(props) {
    super(props);
    const hash = props.route.params.hash;
    let foundTx = {};
    let from = [];
    let to = [];
    for (const tx of BlueApp.getTransactions()) {
      if (tx.hash === hash) {
        foundTx = tx;
        for (const input of foundTx.inputs) {
          from = from.concat(input.addresses);
        }
        for (const output of foundTx.outputs) {
          if (output.addresses) to = to.concat(output.addresses);
          if (output.scriptPubKey && output.scriptPubKey.addresses) to = to.concat(output.scriptPubKey.addresses);
        }
      }
    }

    let wallet = false;
    for (const w of BlueApp.getWallets()) {
      for (const t of w.getTransactions()) {
        if (t.hash === hash) {
          console.log('tx', hash, 'belongs to', w.getLabel());
          wallet = w;
        }
      }
    }
    let memo = '';
    if (BlueApp.tx_metadata[foundTx.hash]) {
      if (BlueApp.tx_metadata[foundTx.hash].memo) {
        memo = BlueApp.tx_metadata[foundTx.hash].memo;
      }
    }
    this.state = {
      isLoading: true,
      tx: foundTx,
      from,
      to,
      wallet,
      isHandOffUseEnabled: false,
      memo,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    this.props.navigation.setParams({ handleOnSaveButtonTapped: this.handleOnSaveButtonTapped });
    const isHandOffUseEnabled = await HandoffSettings.isHandoffUseEnabled();
    this.setState({
      isLoading: false,
      isHandOffUseEnabled,
    });
  }

  handleOnSaveButtonTapped = () => {
    BlueApp.tx_metadata[this.state.tx.hash] = { memo: this.state.memo };
    BlueApp.saveToDisk().then(_success => alert('Transaction note has been successfully saved.'));
  };

  handleOnMemoChangeText = value => {
    this.setState({ memo: value });
  };

  render() {
    if (this.state.isLoading || !('tx' in this.state)) {
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
        <StatusBar barStyle="default" />
        <ScrollView style={styles.scroll}>
          <BlueCard>
            <View>
              <TextInput
                placeholder={loc.send.details_note_placeholder}
                value={this.state.memo}
                placeholderTextColor="#81868e"
                style={styles.memoTextInput}
                onChangeText={this.handleOnMemoChangeText}
              />
              <BlueSpacing20 />
            </View>

            {'from' in this.state && (
              <>
                <View style={styles.rowHeader}>
                  <BlueText style={styles.rowCaption}>{loc.transactions.details_from}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.from.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={styles.rowValue}>{this.state.from.filter(onlyUnique).join(', ')}</BlueText>
              </>
            )}

            {'to' in this.state && (
              <>
                <View style={styles.rowHeader}>
                  <BlueText style={styles.rowCaption}>{loc.transactions.details_to}</BlueText>
                  <BlueCopyToClipboardButton stringToCopy={this.state.to.filter(onlyUnique).join(', ')} />
                </View>
                <BlueText style={styles.rowValue}>{arrDiff(this.state.from, this.state.to.filter(onlyUnique)).join(', ')}</BlueText>
              </>
            )}

            {'fee' in this.state.tx && (
              <>
                <BlueText style={styles.rowCaption}>{loc.send.create_fee}</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.fee + ' sats'}</BlueText>
              </>
            )}

            {'hash' in this.state.tx && (
              <>
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
                  <BlueText style={styles.txLink}>{loc.transactions.details_show_in_block_explorer}</BlueText>
                </TouchableOpacity>
              </>
            )}

            {'received' in this.state.tx && (
              <>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_received}</BlueText>
                <BlueText style={styles.rowValue}>{dayjs(this.state.tx.received).format('MM/DD/YYYY h:mm A')}</BlueText>
              </>
            )}

            {'block_height' in this.state.tx && this.state.tx.block_height > 0 && (
              <>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_block}</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.block_height}</BlueText>
              </>
            )}

            {'inputs' in this.state.tx && (
              <>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_inputs}</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.inputs.length}</BlueText>
              </>
            )}

            {'outputs' in this.state.tx && this.state.tx.outputs.length > 0 && (
              <>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_outputs}</BlueText>
                <BlueText style={styles.rowValue}>{this.state.tx.outputs.length}</BlueText>
              </>
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
  navigation: PropTypes.shape({
    setParams: PropTypes.func,
  }),
};

TransactionsDetails.navigationOptions = ({ navigation, route }) => ({
  ...BlueNavigationStyle(),
  title: loc.transactions.details_title,
  headerStyle: {
    ...BlueNavigationStyle().headerStyle,
    backgroundColor: BlueCurrentTheme.colors.customHeader,
  },
  headerRight: () => (
    <TouchableOpacity disabled={route.params.isLoading === true} style={styles.save} onPress={route.params.handleOnSaveButtonTapped}>
      <Text style={styles.saveText}>{loc.wallets.details_save}</Text>
    </TouchableOpacity>
  ),
});
