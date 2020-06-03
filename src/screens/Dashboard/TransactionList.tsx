import moment from 'moment';
import React, { Component } from 'react';
import { SectionList, SectionListData, Text, View } from 'react-native';
import { connect } from 'react-redux';

import { TransactionItem } from 'app/components';
import { Route, Transaction } from 'app/consts';
import { NavigationService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette, typography } from 'app/styles';

interface TransactionWithDay extends Transaction {
  day: moment.Moment;
  walletLabel: string;
  note: string;
}

interface Props {
  data: any;
  label: string;
  transactions: Transaction[];
}

interface State {
  transactions: ReadonlyArray<SectionListData<TransactionWithDay>>;
}

class TransactionList extends Component<Props, State> {
  state: State = {
    transactions: [],
  };

  static getDerivedStateFromProps(props: Props) {
    const groupedTransactions = [] as any;
    const dataToGroup = props.data
      .map((transaction: any) => {
        const note = props.transactions.map(transactionWithNote => {
          if (transactionWithNote.txid == transaction.txid) {
            return transactionWithNote.note;
          }
          return '';
        });
        return {
          ...transaction,
          day: moment(transaction.received).format('ll'),
          walletLabel: transaction.walletLabel || props.label,
          note,
        };
      })
      .sort((a: any, b: any) => b.time - a.time);

    const uniqueValues = [...new Set(dataToGroup.map((item: any) => item.day))].sort(
      (a: any, b: any) => new Date(b).getTime() - new Date(a).getTime(),
    );

    uniqueValues.map(uniqueValue =>
      groupedTransactions.push({
        title: uniqueValue,
        data: dataToGroup.filter((transaction: any) => transaction.day === uniqueValue),
      }),
    );
    return {
      transactions: groupedTransactions,
    };
  }

  renderSectionTitle = ({ section }: { section: any }) => {
    return (
      <View style={{ marginTop: 30, marginBottom: 10 }}>
        <Text style={{ ...typography.caption, color: palette.textGrey }}>{section.title}</Text>
      </View>
    );
  };

  onTransactionItemPress = (item: Transaction) => {
    NavigationService.navigate(Route.TransactionDetails, { transaction: item });
  };

  render() {
    return (
      <View style={{ padding: 20 }}>
        <SectionList
          sections={this.state.transactions}
          keyExtractor={(item, index) => `${item.txid}-${index}`}
          renderItem={item => <TransactionItem item={item.item} onPress={this.onTransactionItemPress} />}
          renderSectionHeader={this.renderSectionTitle}
        />
      </View>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  transactions: Object.values(state.transactions.transactions),
});

export default connect(mapStateToProps)(TransactionList);
