import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View, ListView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeBlueArea, BlueCard, BlueListItem, BlueHeader } from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height } = Dimensions.get('window');
let ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class SendList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.send.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons name={focused ? 'md-paper-plane' : 'md-paper-plane'} size={26} style={{ color: tintColor }} />
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
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeader
          centerComponent={{
            text: loc.send.list.header,
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
                    navigate('SendDetails', { fromAddress: item.title });
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

SendList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
