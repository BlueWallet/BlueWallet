/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
import React, { Component } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  ListView,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, TabNavigator } from 'react-navigation';
import { Card, Header, Icon, List, ListItem } from 'react-native-elements';
import {
  BlueLoading,
  BlueList,
  BlueListView,
  BlueSpacing,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueListItem,
  BlueHeader,
} from '../../BlueComponents';
let EV = require('../../events');

let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class TransactionsList extends Component {
  static navigationOptions = {
    tabBarLabel: 'Transactions',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-list-box' : 'ios-list-box-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };

    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.refreshFunction.bind(this));
  }

  async componentDidMount() {
    console.log('transaction/list- componentDidMount');
    this.refreshFunction();
  } // end

  refreshFunction() {
    this.setState(
      {
        isLoading: true,
      },
      () => {
        setTimeout(() => {
          this.setState({
            isLoading: false,
            final_balance: BlueApp.getBalance(),
            dataSource: ds.cloneWithRows(BlueApp.getTransactions()),
          });
        }, 1);
      },
    );
  }

  txMemo(hash) {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash]['memo']) {
      return ' | ' + BlueApp.tx_metadata[hash]['memo'];
    }
    return '';
  }

  refresh() {
    this.setState(
      {
        isLoading: true,
      },
      async function() {
        let that = this;
        setTimeout(async function() {
          // more responsive
          let noErr = true;
          try {
            await BlueApp.fetchWalletTransactions();
            await BlueApp.fetchWalletBalances();
          } catch (err) {
            noErr = false;
            console.warn(err);
          }
          if (noErr) await BlueApp.saveToDisk(); // caching
          EV(EV.enum.WALLETS_COUNT_CHANGED); // TODO: some other event type?

          that.setState({
            isLoading: false,
            final_balance: BlueApp.getBalance(),
            dataSource: ds.cloneWithRows(BlueApp.getTransactions()),
          });
        }, 10);
      },
    );
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <Header
          backgroundColor={BlueApp.settings.brandingColor}
          leftComponent={
            <Icon
              name="menu"
              color="#fff"
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: this.state.final_balance + ' BTC',
            style: { color: '#fff', fontSize: 25 },
          }}
          rightComponent={
            <Icon name="refresh" color="#fff" onPress={() => this.refresh()} />
          }
        />
        <BlueCard title="My Transactions">
          <BlueText style={{ marginBottom: 10 }}>
            A list of ingoing or outgoing transactions of your wallets
          </BlueText>

          <BlueList>
            <ListView
              style={{ height: 360 }}
              enableEmptySections
              dataSource={this.state.dataSource}
              renderRow={rowData => {
                return (
                  <BlueListItem
                    avatar={
                      <Icon
                        color={(() => {
                          return (
                            (rowData.confirmations &&
                              ((rowData.value < 0 && '#900') || '#080')) ||
                            '#ebebeb'
                          );
                        })()}
                        name={(() => {
                          return (
                            (rowData.value < 0 && 'call-made') ||
                            'call-received'
                          );
                        })()}
                      />
                    }
                    title={
                      rowData.value / 100000000 +
                      ' BTC' +
                      this.txMemo(rowData.hash)
                    }
                    subtitle={
                      rowData.received
                        .replace(['T'], ' ')
                        .replace(['Z'], ' ')
                        .split('.')[0] +
                      ' | conf: ' +
                      rowData.confirmations +
                      '\nYOLO'
                    }
                    onPress={() => {
                      navigate('TransactionDetails', { hash: rowData.hash });
                    }}
                  />
                );
              }}
            />
          </BlueList>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}
