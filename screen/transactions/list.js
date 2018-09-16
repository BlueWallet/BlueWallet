import React, { Component } from 'react';
import { FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, Icon } from 'react-native-elements';
import { BlueLoading, BlueList, SafeBlueArea, BlueCard, BlueText, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
let loc = require('../../loc');
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');

export default class TransactionsList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.transactions.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons name={focused ? 'ios-list-box' : 'ios-list-box-outline'} size={26} style={{ color: tintColor }} />
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
            dataSource: BlueApp.getTransactions(),
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
            dataSource: BlueApp.getTransactions(),
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
          centerComponent={{
            text: this.state.final_balance + ' BTC',
            style: { color: BlueApp.settings.foregroundColor, fontSize: 25 },
          }}
          rightComponent={<Icon name="refresh" color={BlueApp.settings.foregroundColor} onPress={() => this.refresh()} />}
        />
        <BlueCard title={loc.transactions.list.title}>
          <BlueText style={{ marginBottom: 10 }}>{loc.transactions.list.description}</BlueText>

          <BlueList>
            <FlatList
              data={this.state.dataSource}
              extraData={this.state.dataSource}
              renderItem={rowData => {
                return (
                  <BlueListItem
                    avatar={
                      <Icon
                        color={(() => {
                          return (rowData.confirmations && ((rowData.value < 0 && '#900') || '#080')) || '#ebebeb';
                        })()}
                        name={(() => {
                          return (rowData.value < 0 && 'call-made') || 'call-received';
                        })()}
                      />
                    }
                    title={rowData.value / 100000000 + ' BTC' + this.txMemo(rowData.hash)}
                    subtitle={
                      rowData.received
                        .replace(['T'], ' ')
                        .replace(['Z'], ' ')
                        .split('.')[0] +
                      ' | ' +
                      loc.transactions.list.conf +
                      ': ' +
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

TransactionsList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
