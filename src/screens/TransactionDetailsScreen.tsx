import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import moment from 'moment';
import React, { Component } from 'react';
import { View, StyleSheet, Text, Linking, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';

import { images, icons } from 'app/assets';
import { Image, Header, StyledText, Chip, ScreenTemplate, TranscationLabelStatus } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Route, MainCardStackNavigatorParamList, RootStackParamList, TxType } from 'app/consts';
import { getWalletTypeByLabel, getConfirmationsText } from 'app/helpers/helpers';
import { ApplicationState } from 'app/state';
import {
  createTransactionNote,
  updateTransactionNote,
  CreateTransactionNoteAction,
  UpdateTransactionNoteAction,
} from 'app/state/transactions/actions';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';

const i18n = require('../../loc');

function onlyUnique(value: number, index: number, self: any[]) {
  return self.indexOf(value) === index;
}

function arrDiff(a1: any[], a2: any[]) {
  const ret = [];
  for (const v of a2) {
    if (a1.indexOf(v) === -1) {
      ret.push(v);
    }
  }
  return ret;
}

interface Props {
  transactionNotes: Record<string, string>;
  createTransactionNote: (transactionID: string, note: string) => CreateTransactionNoteAction;
  updateTransactionNote: (transactionID: string, note: string) => UpdateTransactionNoteAction;
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParamList, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParamList, Route.TransactionDetails>
  >;

  route: RouteProp<MainCardStackNavigatorParamList, Route.TransactionDetails>;
}

interface State {
  hash: string;
  isLoading: boolean;
  tx: any;
  from: any[];
  to: any[];
  wallet: any;
  note: string;
}

class TransactionDetailsScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const {
      transaction: { hash },
    } = props.route.params;

    const note = props.transactionNotes[hash] || '';

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
          wallet = w;
        }
      }
    }
    this.state = {
      hash,
      isLoading: true,
      tx: foundTx,
      from,
      to,
      wallet,
      note,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  addToAddressBook = (address: string) => {
    this.props.navigation.navigate(Route.CreateContact, { address });
  };

  updateNote = (note: string) => {
    const {
      transaction: { hash },
    } = this.props.route.params;
    if (!this.state.note) {
      this.props.createTransactionNote(hash, note);
    } else {
      this.props.updateTransactionNote(hash, note);
    }

    this.setState({
      note,
    });
  };

  renderHeader = () => {
    const { transaction } = this.props.route.params;
    const valuePreffix = transaction.value < 0 ? '' : '+';
    return (
      <View style={styles.headerContainer}>
        <Image source={transaction.value < 0 ? images.bigMinus : images.bigPlus} style={styles.image} />
        <View style={styles.walletIconContainer}>
          <Image
            source={transaction.value > 0 ? icons.arrowRight : icons.arrowLeft}
            style={styles.arrowIcon}
            resizeMode="contain"
          />
          <Image source={icons.wallet} style={styles.walletIcon} resizeMode="contain" />
        </View>
        <Text style={styles.walletLabel}>{transaction.walletLabel}</Text>
        <Text style={[styles.value, { color: transaction.value < 0 ? palette.textRed : palette.textBlack }]}>
          {`${valuePreffix}${i18n.formatBalanceWithoutSuffix(
            Number(transaction.value),
            transaction.walletPreferredBalanceUnit,
          )} ${transaction.walletPreferredBalanceUnit}`}
        </Text>
        <TranscationLabelStatus type={transaction.tx_type} />

        {transaction.tx_type !== TxType.ALERT_RECOVERED && (
          <Chip
            containerStyle={styles.chipContainer}
            label={`${getConfirmationsText(transaction.tx_type, transaction.confirmations)} ${
              i18n.transactions.details.confirmations
            }`}
            textStyle={typography.overline}
          />
        )}
      </View>
    );
  };

  editNote = () => {
    const { transaction } = this.props.route.params;
    this.props.navigation.navigate(Route.EditText, {
      title: moment.unix(transaction.time).format('lll'),
      label: i18n.transactions.details.note,
      onSave: this.updateNote,
      value: this.state.note,
      header: this.renderHeader(),
    });
  };

  getTransactionTypeLabel = (txType: TxType) => {
    switch (txType) {
      case TxType.ALERT_PENDING:
      case TxType.ALERT_RECOVERED:
      case TxType.ALERT_CONFIRMED:
        return i18n.transactions.transactionTypeLabel.standard;
      case TxType.RECOVERY:
        return i18n.transactions.transactionTypeLabel.canceled;
      case TxType.INSTANT:
      case TxType.NONVAULT:
        return i18n.transactions.transactionTypeLabel.fast;
      default:
        return '';
    }
  };

  render() {
    const { transaction } = this.props.route.params;
    const fromValue = this.state.from.filter(onlyUnique).join(', ');
    const toValue = arrDiff(this.state.from, this.state.to.filter(onlyUnique)).join(', ');
    return (
      <ScreenTemplate
        header={
          <Header
            navigation={this.props.navigation}
            isBackArrow
            title={
              transaction.time ? moment.unix(transaction.time).format('lll') : i18n.transactions.details.timePending
            }
          />
        }
      >
        {this.renderHeader()}
        {this.state.note ? (
          <TouchableOpacity style={styles.noteContainer} onPress={this.editNote}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.note}</Text>
            <Text style={styles.contentRowBody}>{this.state.note}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerContainer}>
            <StyledText title={i18n.transactions.details.addNote} onPress={this.editNote} />
          </View>
        )}
        <View style={styles.contentRowContainer}>
          <Text style={styles.contentRowTitle}>{i18n.transactions.details.walletType}</Text>
          <Text style={styles.contentRowBody}>{getWalletTypeByLabel(transaction.walletLabel)}</Text>
        </View>
        <View style={styles.contentRowContainer}>
          <View style={styles.row}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.from}</Text>
            <CopyButton textToCopy={fromValue.split(',')[0]} />
          </View>
          <Text style={styles.contentRowBody}>{fromValue}</Text>
          <StyledText
            title={i18n.transactions.details.addToAddressBook}
            onPress={() => {
              this.addToAddressBook(fromValue);
            }}
          />
        </View>
        <View style={styles.contentRowContainer}>
          <View style={styles.row}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.to}</Text>
            <CopyButton textToCopy={toValue.split(',')[0]} />
          </View>
          <Text style={styles.contentRowBody}>{toValue}</Text>
        </View>
        <View style={styles.contentRowContainer}>
          <View style={styles.row}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.transactionId}</Text>
            <CopyButton textToCopy={this.state.tx.txid} />
          </View>
          <Text style={styles.contentRowBody}>{this.state.tx.txid}</Text>
          <StyledText
            title={i18n.transactions.details.viewInBlockRxplorer}
            onPress={() => {
              const url = `http://explorer.bitcoinvault.global/tx/${this.state.tx.txid}`;
              Linking.canOpenURL(url).then(supported => {
                if (supported) {
                  Linking.openURL(url);
                }
              });
            }}
          />
        </View>
        <View style={styles.contentRowContainer}>
          <Text style={styles.contentRowTitle}>{i18n.transactions.details.transactionType}</Text>
          <Text style={styles.contentRowBody}>{this.getTransactionTypeLabel(transaction.tx_type)}</Text>
        </View>
        <View style={styles.contentRowContainer}>
          <Text style={styles.contentRowTitle}>{i18n.transactions.details.inputs}</Text>
          <Text style={styles.contentRowBody}>{transaction.inputs.length}</Text>
        </View>
        <View style={styles.contentRowContainer}>
          <Text style={styles.contentRowTitle}>{i18n.transactions.details.ouputs}</Text>
          <Text style={styles.contentRowBody}>{transaction.outputs.length}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  transactionNotes: state.transactions.transactionNotes,
});

const mapDispatchToProps = {
  createTransactionNote,
  updateTransactionNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionDetailsScreen);

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    marginBottom: 13,
  },
  walletLabel: {
    ...typography.headline8,
  },
  value: { ...typography.headline5, marginTop: 6, marginBottom: 10 },
  image: {
    height: 90,
    width: 90,
    margin: 15,
  },
  noteContainer: {
    width: '100%',
    alignSelf: 'flex-start',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    paddingBottom: 2,
    marginBottom: 13,
  },
  chipContainer: { marginTop: 10, marginBottom: 12 },
  walletIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  walletIcon: {
    width: 14,
    height: 14,
  },
  contentRowContainer: { marginVertical: 14 },
  contentRowTitle: { ...typography.overline, color: palette.textGrey },
  contentRowBody: { ...typography.caption, marginTop: 4, marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
