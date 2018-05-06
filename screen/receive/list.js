/** @type {AppStorage} */
import React, { Component } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Icon } from 'react-native-elements';
import {
  BlueLoading,
  SafeBlueArea,
  BlueCard,
  BlueListItem,
  BlueHeader,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BlueApp = require('../../BlueApp');
let EV = require('../../events');

export default class ReceiveList extends Component {
  static navigationOptions = {
    tabBarLabel: 'Receive',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-cash' : 'ios-cash-outline'}
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
          backgroundColor={BlueApp.settings.brandingColor}
          centerComponent={{
            text: 'Choose a wallet to receive',
            style: { color: '#fff', fontSize: 25 },
          }}
        />

        <BlueCard containerStyle={{ padding: 0 }}>
          {this.state.list.map((item, i) => (
            <BlueListItem
              onPress={() => {
                navigate('ReceiveDetails', { address: item.title });
              }}
              key={i}
              title={item.title}
              subtitle={item.subtitle}
              leftIcon={{
                name: 'bitcoin',
                type: 'font-awesome',
                color: 'white',
              }}
            />
          ))}
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
