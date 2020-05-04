import moment from 'moment';
import React, { Component } from 'react';
import { View, Text, SectionList } from 'react-native';
import { connect } from 'react-redux';

import { TransactionItem } from 'app/components';
import { Route, Transaction } from 'app/consts';
import { NavigationService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette, typography } from 'app/styles';

interface Props {
  data: any;
  label: string;
  transactions: Transaction[];
}

class TransactionList extends Component<Props> {
  state = {
    transactions: [],
  };

  static getDerivedStateFromProps(props: Props) {
    const groupedTransactions = [] as any;
    const dataToGroup = props.data
      .map((transaction: any) => {
        const note = props.transactions.map(transactionWithNote => {
          if (transactionWithNote.hash == transaction.hash) {
            return transactionWithNote.note;
          }
          return '';
        })[0];
        const transactionWithDay = {
          ...transaction,
          day: moment.unix(transaction.time).format('ll'),
          walletLabel: transaction.walletLabel || props.label,
          note,
        };

        return transactionWithDay;
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
    // @ts-ignore
    NavigationService.navigate(Route.TransactionDetails, { transaction: item });
  };

  render() {
    return (
      <View style={{ padding: 20 }}>
        <SectionList
          sections={this.state.transactions}
          keyExtractor={(item, index) => item + index}
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
