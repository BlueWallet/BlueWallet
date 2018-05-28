import React, { Component } from 'react';
import { ListView, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueLoading,
  BlueList,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueListItem,
  BlueHeader,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class WalletsList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.wallets.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
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
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.refreshFunction.bind(this));
  }

  async componentDidMount() {
    this.refreshFunction();
  } // end of componendDidMount

  refreshFunction() {
    this.setState(
      {
        isLoading: true,
      },
      () => {
        setTimeout(() => {
          this.setState({
            isLoading: false,
            dataSource: ds.cloneWithRows(BlueApp.getWallets()),
          });
        }, 1);
      },
    );
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea>
        <BlueHeader
          centerComponent={{
            text: loc.wallets.list.app_name,
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />
        <BlueCard title={loc.wallets.list.title}>
          <BlueText style={{ marginBottom: 10 }}>
            {loc.wallets.list.header}
          </BlueText>

          <BlueList>
            <ListView
              enableEmptySections
              maxHeight={(isIpad && 60) || height - 390}
              dataSource={this.state.dataSource}
              renderRow={rowData => {
                return (
                  <BlueListItem
                    onPress={() => {
                      navigate('WalletDetails', {
                        address: rowData.getAddress(),
                      });
                    }}
                    leftIcon={{
                      name: 'bitcoin',
                      type: 'font-awesome',
                      color: BlueApp.settings.foregroundColor,
                    }}
                    title={
                      rowData.getLabel() + ' | ' + rowData.getBalance() + ' BTC'
                    }
                    subtitle={rowData.getShortAddress()}
                    hideChevron={false}
                  />
                );
              }}
            />
          </BlueList>
        </BlueCard>

        <BlueButton
          icon={{ name: 'plus-small', type: 'octicon' }}
          onPress={() => {
            navigate('AddWallet');
          }}
          title={loc.wallets.list.add}
        />
      </SafeBlueArea>
    );
  }
}

WalletsList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
