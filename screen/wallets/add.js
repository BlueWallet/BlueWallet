import { SegwitP2SHWallet } from '../../class';
import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueSpacing,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class WalletsAdd extends Component {
  static navigationOptions = {
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
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, paddingTop: 40 }}
      >
        <BlueSpacing />
        <BlueCard title={loc.wallets.add.title}>
          <BlueText>{loc.wallets.add.description}</BlueText>

          <BlueButton
            large
            icon={{ name: 'qrcode', type: 'font-awesome' }}
            title={loc.wallets.add.scan}
            onPress={() => {
              this.props.navigation.navigate('ScanQrWif');
            }}
          />

          <BlueButton
            large
            icon={{ name: 'bitcoin', type: 'font-awesome' }}
            title={loc.wallets.add.create}
            onPress={() => {
              this.props.navigation.goBack();
              setTimeout(async () => {
                let w = new SegwitP2SHWallet();
                w.setLabel(loc.wallets.add.label_new_segwit);
                w.generate();
                BlueApp.wallets.push(w);
                await BlueApp.saveToDisk();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              }, 1);
            }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

WalletsAdd.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
