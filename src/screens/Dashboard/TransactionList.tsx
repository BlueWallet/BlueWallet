import moment from 'moment';
import React, { Component } from 'react';
import { View, Text, SectionList } from 'react-native';

import { TransactionItem } from 'app/components';
import { palette, typography } from 'app/styles';

interface Props {
  data: any;
  label: string;
}

export class TransactionList extends Component<Props> {
  state = {
    transactions: [],
  };

  static getDerivedStateFromProps(props: Props) {
    const groupedTransactions = [] as any;
    const dataToGroup = props.data.map((transaction: any) => ({
      ...transaction,
      day: moment.unix(transaction.time).format('ll'),
      walletLabel: transaction.walletLabel || props.label,
    }));
    const uniqueValues = [...new Set(dataToGroup.map((item: any) => item.day))];
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

  render() {
    return (
      <View style={{ padding: 20 }}>
        <SectionList
          sections={this.state.transactions}
          keyExtractor={(item, index) => item + index}
          renderItem={item => <TransactionItem item={item.item} />}
          renderSectionHeader={this.renderSectionTitle}
        />
      </View>
    );
  }
}
