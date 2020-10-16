import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { map, compose, uniq, flatten, join } from 'lodash/fp';
import moment from 'moment';
import React, { Component } from 'react';
import { View, StyleSheet, Text, Linking, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';

import { images, icons } from 'app/assets';
import { Image, Header, StyledText, Chip, ScreenTemplate, TranscationLabelStatus } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Route, MainCardStackNavigatorParams, RootStackParams, TxType } from 'app/consts';
import { getConfirmationsText } from 'app/helpers/helpers';
import { ApplicationState } from 'app/state';
import { selectors, reducer } from 'app/state/transactionsNotes';
import {
  createTransactionNoteSuccess,
  updateTransactionNote,
  CreateTransactionNoteAction,
  UpdateTransactionNoteAction,
} from 'app/state/transactionsNotes/actions';
import { typography, palette } from 'app/styles';

import config from '../../config';

const i18n = require('../../loc');

interface Props {
  transactionNotes: Record<string, string>;
  createTransactionNoteSuccess: (transactionID: string, note: string) => CreateTransactionNoteAction;
  updateTransactionNote: (transactionID: string, note: string) => UpdateTransactionNoteAction;
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.TransactionDetails>
  >;
  note: string;
  route: RouteProp<MainCardStackNavigatorParams, Route.TransactionDetails>;
}

class TransactionDetailsScreen extends Component<Props> {
  addToAddressBook = (address: string) => {
    this.props.navigation.navigate(Route.CreateContact, { address });
  };

  updateNote = (note: string) => {
    const {
      transaction: { hash },
    } = this.props.route.params;
    if (!this.props.note) {
      this.props.createTransactionNoteSuccess(hash, note);
    } else {
      this.props.updateTransactionNote(hash, note);
    }
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
    const { note } = this.props;
    this.props.navigation.navigate(Route.EditText, {
      title: transaction.time ? moment.unix(transaction.time).format('lll') : '',
      label: i18n.transactions.details.note,
      onSave: this.updateNote,
      value: note,
      header: this.renderHeader(),
    });
  };

  getTransactionTypeLabel = (txType: TxType) => {
    switch (txType) {
      case TxType.ALERT_PENDING:
      case TxType.ALERT_RECOVERED:
      case TxType.ALERT_CONFIRMED:
        return i18n.transactions.transactionTypeLabel.secure;
      case TxType.RECOVERY:
        return i18n.transactions.transactionTypeLabel.canceled;
      case TxType.INSTANT:
        return i18n.transactions.transactionTypeLabel.secureFast;
      case TxType.NONVAULT:
        return i18n.transactions.transactionTypeLabel.standard;
      default:
        return '';
    }
  };

  getAddresses = (key: 'inputs' | 'outputs') => {
    const { transaction } = this.props.route.params;

    return compose(
      join(', '),
      uniq,
      flatten,
      map((el: { addresses: string[] }) => el.addresses),
    )(transaction[key]);
  };

  render() {
    const { transaction } = this.props.route.params;
    const fromValue = this.getAddresses('inputs');
    const toValue = this.getAddresses('outputs');
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
        {this.props.note ? (
          <TouchableOpacity style={styles.noteContainer} onPress={this.editNote}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.note}</Text>
            <Text style={styles.contentRowBody}>{this.props.note}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerContainer}>
            <StyledText title={i18n.transactions.details.addNote} onPress={this.editNote} />
          </View>
        )}
        <View style={styles.contentRowContainer}>
          <Text style={styles.contentRowTitle}>{i18n.transactions.details.walletType}</Text>
          <Text style={styles.contentRowBody}>{transaction.walletTypeReadable}</Text>
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
            <CopyButton textToCopy={transaction.txid} />
          </View>
          <Text style={styles.contentRowBody}>{transaction.txid}</Text>
          {!config.isBeta && (
            <StyledText
              title={i18n.transactions.details.viewInBlockRxplorer}
              onPress={() => {
                const url = `http://explorer.bitcoinvault.global/tx/${transaction.txid}`;
                Linking.canOpenURL(url).then(supported => {
                  if (supported) {
                    Linking.openURL(url);
                  }
                });
              }}
            />
          )}
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

const mapStateToProps = (state: ApplicationState & reducer.TransactionsNotesState, props: Props) => {
  const {
    transaction: { hash },
  } = props.route.params;
  return {
    note: selectors.getTxNoteByHash(state, hash),
  };
};

const mapDispatchToProps = {
  createTransactionNoteSuccess,
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
