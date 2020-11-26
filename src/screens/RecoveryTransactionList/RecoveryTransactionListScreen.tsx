import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList, SectionListData } from 'react-native';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, Image, TransactionItem, Button, CheckBox, WalletDropdown } from 'app/components';
import { MainCardStackNavigatorParams, Route, RootStackParams, Transaction, Wallet } from 'app/consts';
import { getGroupedTransactions } from 'app/helpers/transactions';
import { ApplicationState } from 'app/state';
import { selectors } from 'app/state/wallets';
import { WalletsState } from 'app/state/wallets/reducer';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface NavigationProps {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.RecoveryTransactionList>
  >;

  route: RouteProp<MainCardStackNavigatorParams, Route.RecoveryTransactionList>;
}

interface MapStateProps {
  wallets: Wallet[];
  transactions: Transaction[];
}
interface State {
  selectedTransactions: Transaction[];
}

type Props = NavigationProps & MapStateProps;

export class RecoveryTransactionListScreen extends PureComponent<Props, State> {
  state = {
    selectedTransactions: [],
  };

  showModal = () => {
    const { navigation, route, wallets } = this.props;
    const { wallet } = route.params;

    const selectedIndex = wallets.findIndex((w: Wallet) => w.id === wallet.id);

    navigation.navigate(Route.ActionSheet, {
      wallets,
      selectedIndex,
      onPress: (index: number) => {
        const newWallet = wallets[index];
        this.setState({ selectedTransactions: [] }, () => {
          navigation.setParams({ wallet: newWallet });
        });
      },
    });
  };

  renderListEmpty = () => {
    return (
      <View style={styles.noTransactionsContainer}>
        <Image source={images.noTransactions} style={styles.noTransactionsImage} />
        <Text style={styles.noTransactionsLabel}>{i18n.wallets.dashboard.noTransactions}</Text>
      </View>
    );
  };

  addTranscation = (transaction: Transaction) => {
    this.setState((state: State) => ({ selectedTransactions: [...state.selectedTransactions, transaction] }));
  };

  removeTranscation = (transaction: Transaction) => {
    this.setState((state: State) => ({
      selectedTransactions: state.selectedTransactions.filter(t => t.hash !== transaction.hash),
    }));
  };

  isChecked = (transaction: Transaction) => {
    const { selectedTransactions } = this.state;

    return selectedTransactions.some((t: Transaction) => t.hash === transaction.hash);
  };

  areAllTransactionsSelected = () => {
    const { selectedTransactions } = this.state;
    const { transactions } = this.props;

    return !!!transactions.filter(t => !!!selectedTransactions.find((s: Transaction) => s.txid === t.txid)).length;
  };

  addAllTransactions = () => {
    const { transactions } = this.props;

    this.setState({ selectedTransactions: transactions });
  };

  removeAllTransactions = () => {
    this.setState({ selectedTransactions: [] });
  };

  toggleAllTransactions = (areAllTransactionsSelected: boolean) => () => {
    areAllTransactionsSelected ? this.removeAllTransactions() : this.addAllTransactions();
  };

  canSubmit = () => {
    const { selectedTransactions } = this.state;
    return !!selectedTransactions.length;
  };

  submit = () => {
    const { navigation, route } = this.props;
    const { wallet } = route.params;
    const { selectedTransactions } = this.state;

    navigation.navigate(Route.RecoverySend, { wallet, transactions: selectedTransactions });
  };

  toggleTransaction = (isChecked: boolean, transaction: Transaction) => () =>
    isChecked ? this.removeTranscation(transaction) : this.addTranscation(transaction);

  renderItem = ({ item: transaction }: { item: Transaction }) => {
    const isChecked = this.isChecked(transaction);
    const toggle = this.toggleTransaction(isChecked, transaction);
    return (
      <View style={styles.itemWrapper}>
        <View style={styles.transactionItemContainer}>
          <TransactionItem onPress={toggle} item={transaction} />
        </View>
        <CheckBox onPress={toggle} right checked={isChecked} />
      </View>
    );
  };

  renderSectionHeader = ({ section: { title } }: { section: SectionListData<Transaction> }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  isEmptyList = () => !!!this.props.transactions.length;

  render() {
    const { navigation, route, transactions } = this.props;
    const { wallet } = route.params;
    const areAllTransactionsSelected = this.areAllTransactionsSelected();
    const toggleAll = this.toggleAllTransactions(areAllTransactionsSelected);

    return (
      <View style={styles.container}>
        <Header title={i18n.send.recovery.recover} isBackArrow />
        <View style={styles.contentContainer}>
          <WalletDropdown
            onSelectPress={this.showModal}
            balance={wallet.balance}
            label={wallet.label}
            unit={wallet.preferredBalanceUnit}
          />
          {!this.isEmptyList() && (
            <TouchableOpacity onPress={toggleAll} style={styles.toggleAllWrapper}>
              <CheckBox onPress={toggleAll} right checked={areAllTransactionsSelected} />
            </TouchableOpacity>
          )}
          <SectionList
            style={styles.listViewWrapper}
            sections={getGroupedTransactions(transactions)}
            keyExtractor={item => item.txid}
            renderItem={this.renderItem}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={this.renderSectionHeader}
            ListEmptyComponent={this.renderListEmpty}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button onPress={this.submit} disabled={!this.canSubmit()} title={i18n.send.details.next} />
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state: ApplicationState & WalletsState, props: Props): MapStateProps => {
  const { wallet } = props.route.params;
  return {
    wallets: selectors.walletsWithRecoveryTransaction(state),
    transactions: selectors.getTransactionsToRecoverByWalletId(state, wallet.id),
  };
};

export default connect(mapStateToProps)(RecoveryTransactionListScreen);

const styles = StyleSheet.create({
  sectionHeader: {
    color: palette.textGrey,
    paddingVertical: 20,
    ...typography.body,
  },
  listViewWrapper: { paddingBottom: 20, height: '90%' },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  container: {
    height: '100%',
    backgroundColor: palette.white,
  },
  noTransactionsContainer: {
    alignItems: 'center',
  },
  noTransactionsImage: { height: 167, width: 167, marginVertical: 30 },
  noTransactionsLabel: {
    ...typography.caption,
    color: palette.textGrey,
  },
  toggleAllWrapper: {
    width: 50,
    height: 50,
    marginTop: -40,
    right: -9,
    display: 'flex',
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginRight: -10,
  },
  transactionItemContainer: {
    flexWrap: 'wrap',
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 15,
    backgroundColor: palette.background,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
