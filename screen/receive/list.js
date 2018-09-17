import React, { Component } from 'react';
import { ListView, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlueLoading, SafeBlueArea, BlueCard, BlueListItem, BlueHeader } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
let loc = require('../../loc');
const { height } = Dimensions.get('window');
let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class ReceiveList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.receive.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons name={focused ? 'ios-cash' : 'ios-cash-outline'} size={26} style={{ color: tintColor }} />
    ),
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
    this.walletsCount = 0;
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => {
      return this.componentDidMount();
    });
  }

  async componentDidMount() {
    console.log('receive/list - componentDidMount');
    let list = [];

    this.walletsCount = 0;
    for (let w of BlueApp.getWallets()) {
      list.push({
        title: w.getAddress(),
        subtitle: w.getLabel(),
      });
      this.walletsCount++;
    }

    this.setState({
      isLoading: false,
      list: list,
      dataSource: ds.cloneWithRows(list),
    });
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeader
          centerComponent={{
            text: loc.receive.list.header,
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />

        <BlueCard containerStyle={{ padding: 0 }}>
          <ListView
            maxHeight={height - 200}
            enableEmptySections
            dataSource={this.state.dataSource}
            renderRow={item => {
              return (
                <BlueListItem
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => {
                    navigate('ReceiveDetails', { address: item.title });
                  }}
                  leftIcon={{
                    name: 'bitcoin',
                    type: 'font-awesome',
                    color: BlueApp.settings.foregroundColor,
                  }}
                />
              );
            }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

ReceiveList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
