import { curry, map } from 'lodash/fp';
import React, { PureComponent } from 'react';
import { SectionList, SectionListData, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Image, TransactionItem } from 'app/components';
import { Route, Transaction, Filters } from 'app/consts';
import { filterTransaction, filterBySearch } from 'app/helpers/filters';
import { getGroupedTransactions } from 'app/helpers/transactions';
import { NavigationService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  label: string;
  search: string;
  filters: Filters;
  transactions: Transaction[];
  transactionNotes: Record<string, string>;
  headerHeight: number;
  ListHeaderComponent: React.ReactElement;
  refreshing: boolean;
  onRefresh: () => void;
  reference: React.Ref<SectionList>;
}

class TransactionList extends PureComponent<Props> {
  renderSectionTitle = ({ section }: { section: SectionListData<Transaction> }) => {
    return (
      <View style={styles.sectionTitle}>
        <Text style={{ ...typography.caption, color: palette.textGrey }}>{section.title}</Text>
      </View>
    );
  };

  onTransactionItemPress = (item: Transaction) => {
    NavigationService.navigate(Route.TransactionDetails, { transaction: item });
  };

  renderListEmpty = () => {
    return (
      <View style={styles.noTransactionsContainer}>
        <Image source={images.noTransactions} style={styles.noTransactionsImage} />
        <Text style={styles.noTransactionsLabel}>{i18n.wallets.dashboard.noTransactions}</Text>
      </View>
    );
  };

  getSectionData = () => {
    const { search, transactions, filters, transactionNotes } = this.props;
    return getGroupedTransactions(
      transactions,
      curry(filterBySearch)(search),
      curry(filterTransaction)(filters),
      map((tx: Transaction) => ({ ...tx, note: transactionNotes[tx.hash] })),
    );
  };

  renderItem = ({ item: transaction }: { item: Transaction }) => {
    return (
      <View style={styles.itemWrapper}>
        <TransactionItem item={transaction} onPress={this.onTransactionItemPress} />
      </View>
    );
  };

  render() {
    const {
      headerHeight,
      search,
      transactions,
      ListHeaderComponent,
      refreshing,
      onRefresh,
      reference,
      filters,
    } = this.props;
    return (
      <SectionList
        ref={reference}
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={[styles.section, filters.isFilteringOn && styles.spaceBottom]}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={search ? <View style={{ height: transactions.length ? headerHeight / 2 : 0 }} /> : null}
        sections={this.getSectionData()}
        keyExtractor={(item, index) => `${item.txid}-${index}`}
        renderItem={this.renderItem}
        renderSectionHeader={this.renderSectionTitle}
        ListEmptyComponent={this.renderListEmpty}
      />
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  filters: state.filters,
});

export default connect(mapStateToProps)(TransactionList);

const styles = StyleSheet.create({
  sectionTitle: { marginTop: 15, marginBottom: 10, paddingHorizontal: 20 },
  itemWrapper: {
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  spaceBottom: {
    marginBottom: 140,
  },
  section: {
    marginBottom: 120,
    marginTop: -24,
  },
  noTransactionsContainer: {
    alignItems: 'center',
  },
  noTransactionsImage: { height: 167, width: 167, marginVertical: 30 },
  noTransactionsLabel: {
    ...typography.caption,
    color: palette.textGrey,
    marginBottom: 20,
  },
});
