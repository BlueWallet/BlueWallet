import React, { Component } from 'react';
import { Constants } from 'expo';
import { ScrollView, TouchableOpacity, TouchableHighlight, Linking, View, Dimensions } from 'react-native';
import {
  BlueSpacingVariable,
  BlueTextCentered,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');

export default class ManageFunds extends Component {
  static navigationOptions = {
    tabBarVisible: false,
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
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueSpacingVariable />
        <BlueHeaderDefaultSub leftText={'manage funds'} onClose={() => this.props.navigation.goBack()} />

        <BlueCard>
          <View>
            <ListItem
              titleStyle={{ color: BlueApp.settings.foregroundColor }}
              component={TouchableOpacity}
              onPress={a => {
                alert(a.target);
              }}
              title={'Refill'}
            />

            <ListItem
              titleStyle={{ color: BlueApp.settings.foregroundColor }}
              component={TouchableOpacity}
              onPress={a => {
                alert(a.target);
              }}
              title={'Withdraw'}
            />
          </View>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}
