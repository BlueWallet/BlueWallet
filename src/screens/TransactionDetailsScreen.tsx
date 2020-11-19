import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import { map, compose, uniq, flatten, join } from 'lodash/fp';
import React, { Component } from 'react';
import { View, StyleSheet, Text, Linking, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';

import { icons } from 'app/assets';
import {
  Image,
  Header,
  StyledText,
  Chip,
  ScreenTemplate,
  TransactionLabelStatus,
  Label,
  EllipsisText,
} from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Route, MainCardStackNavigatorParams, RootStackParams, TxType, CONST } from 'app/consts';
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
import { satoshiToBtc, formatToBtcv, formatToBtcvWithoutUnit } from '../../utils/bitcoin';

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
    const trimmedNote = note.trim();
    if (!this.props.note) {
      this.props.createTransactionNoteSuccess(hash, trimmedNote);
    } else {
      this.props.updateTransactionNote(hash, trimmedNote);
    }
  };

  get isMinusValue() {
    const { transaction } = this.props.route.params;
    return transaction.valueWithoutFee < 0;
  }

  renderHeader = () => {
    const { transaction } = this.props.route.params;

    return (
      <View style={[styles.headerContainer, transaction.isRecoveredAlertToMe ? styles.opacity : null]}>
        <View style={styles.walletInfoContainer}>
          <View style={styles.walletIconContainer}>
            <Image
              source={this.isMinusValue ? icons.arrowRight : icons.arrowLeft}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
            <Image source={icons.wallet} style={styles.walletIcon} resizeMode="contain" />
            <EllipsisText style={styles.walletLabel}>{transaction.walletLabel}</EllipsisText>
          </View>
          {transaction.toExternalAddress !== undefined && (
            <View style={styles.rowWrapper}>
              <Text style={styles.lightGrayText}>{i18n.transactions.details.toExternalWallet}</Text>
            </View>
          )}
          {transaction.toInternalAddress !== undefined && (
            <View style={styles.rowWrapper}>
              <Text style={styles.lightGrayText}>{i18n.transactions.details.toInternalWallet}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.value,
            this.isMinusValue ? styles.textRed : styles.textBlack,
            transaction.toExternalAddress ? styles.lightGrayText : null,
          ]}
        >
          {formatToBtcvWithoutUnit(satoshiToBtc(transaction.valueWithoutFee).toNumber())}
        </Text>
        <Text style={styles.unit}>{CONST.preferredBalanceUnit}</Text>
        <TransactionLabelStatus status={transaction.status} />
        {transaction.blockedAmount !== undefined && (
          <View style={styles.amountWrapper}>
            <Text style={[styles.value, styles.textRed]}>{formatToBtcv(transaction.blockedAmount)}</Text>
            <Label>{i18n.transactions.details.blocked}</Label>
          </View>
        )}

        {transaction.unblockedAmount !== undefined && (
          <View style={styles.amountWrapper}>
            <Text style={[styles.value, transaction.toExternalAddress ? styles.lightGrayText : styles.textBlack]}>
              {formatToBtcv(transaction.unblockedAmount)}
            </Text>
            <Label>{i18n.transactions.details.blocked}</Label>
          </View>
        )}
        {transaction.tx_type !== TxType.ALERT_RECOVERED && (
          <Chip
            containerStyle={styles.chipContainer}
            label={`${getConfirmationsText(transaction.tx_type, transaction.confirmations)} ${
              i18n.transactions.details.confirmations
            }`}
            textStyle={typography.overline}
          />
        )}
        {transaction.returnedFee !== undefined && (
          <View style={styles.rowWrapper}>
            <Text
              style={[styles.label, typography.headline5, transaction.toExternalAddress ? styles.lightGrayText : null]}
            >
              {i18n.transactions.details.returnedFee}&nbsp;
            </Text>
            <Text
              style={[styles.label, typography.headline5, transaction.toExternalAddress ? styles.lightGrayText : null]}
            >
              {formatToBtcv(transaction.returnedFee)}
            </Text>
          </View>
        )}
        {transaction.fee !== undefined && (
          <View style={styles.rowWrapper}>
            <Text style={[styles.label, typography.headline5]}>{i18n.transactions.details.fee}&nbsp;</Text>
            <Text style={[styles.label, typography.headline5]}>{formatToBtcv(transaction.fee)}</Text>
          </View>
        )}
      </View>
    );
  };

  editNote = () => {
    const { transaction } = this.props.route.params;
    const { note } = this.props;
    this.props.navigation.navigate(Route.EditText, {
      title: transaction.time ? dayjs.unix(transaction.time).format('lll') : '',
      label: i18n.transactions.details.note,
      onSave: this.updateNote,
      value: note,
      header: this.renderHeader(),
      emptyValueAllowed: true,
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
    const splitForm = fromValue.split(',')[0];
    return (
      <ScreenTemplate
        header={
          <Header
            // @ts-ignore
            navigation={this.props.navigation}
            isBackArrow
            title={
              transaction.time ? dayjs.unix(transaction.time).format('lll') : i18n.transactions.details.timePending
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
            <CopyButton textToCopy={splitForm} />
          </View>
          <Text style={styles.contentRowBody}>{fromValue}</Text>
          <StyledText
            title={i18n.transactions.details.addToAddressBook}
            onPress={() => {
              this.addToAddressBook(splitForm);
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
          <StyledText
            title={i18n.transactions.details.viewInBlockRxplorer}
            onPress={() => {
              const url = `${config.explorerUrl}/tx/${transaction.txid}`;
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
        {transaction.recoveredTxsCounter !== undefined && (
          <View style={styles.contentRowContainer}>
            <Text style={styles.contentRowTitle}>{i18n.transactions.details.numberOfCancelTransactions}</Text>
            <Text style={styles.contentRowBody}>{transaction.recoveredTxsCounter}</Text>
          </View>
        )}
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

// @ts-ignore - TODO: fix it later
export default connect(mapStateToProps, mapDispatchToProps)(TransactionDetailsScreen);

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    marginBottom: 13,
  },
  walletLabel: {
    ...typography.headline8,
  },
  opacity: {
    opacity: 0.4,
  },
  lightGrayText: {
    color: palette.textGrey,
    ...typography.caption,
  },
  amountWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  textRed: {
    color: palette.textRed,
  },
  textBlack: {
    color: palette.textBlack,
  },
  rowWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    ...typography.caption,
    color: palette.textGrey,
  },
  value: {
    ...typography.headline5,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 15,
    height: 25,
  },
  unit: {
    ...typography.headline5,
    lineHeight: 15,
    height: 25,
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
  walletInfoContainer: {
    marginBottom: 20,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  walletIcon: {
    marginHorizontal: 5,
    width: 14,
    height: 14,
  },
  contentRowContainer: { marginVertical: 14 },
  contentRowTitle: { ...typography.overline, color: palette.textGrey },
  contentRowBody: { ...typography.caption, marginTop: 4, marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
