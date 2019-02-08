import React, { Component } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, WalletsCarouselInformationView } from '../../BlueComponents';
import SortableList from 'react-native-sortable-list';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc/');

export default class ReorderWallets extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(
      navigation,
      true,
      navigation.getParam('customCloseButtonFunction') ? navigation.state.params.customCloseButtonFunction : undefined,
    ),
    title: loc.wallets.reorder.title,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: [],
      hasMovedARow: false,
    };
  }

  componentDidMount() {
    this.props.navigation.setParams({
      customCloseButtonFunction: async () => {
        if (this.sortableList.state.data.length === this.state.data.length && this.state.hasMovedARow) {
          let newWalletsOrderArray = [];
          this.sortableList.state.order.forEach(element => {
            newWalletsOrderArray.push(this.state.data[element]);
          });
          BlueApp.wallets = newWalletsOrderArray;
          await BlueApp.saveToDisk();
          setTimeout(function() {
            EV(EV.enum.WALLETS_COUNT_CHANGED);
          }, 500); // adds some animaton
          this.props.navigation.dismiss();
        } else {
          this.props.navigation.dismiss();
        }
      },
    });

    const wallets = BlueApp.getWallets();
    this.setState({
      data: wallets,
      isLoading: false,
    });
  }

  _renderItem = (item, _active) => {
    if (!item.data) {
      return;
    }
    item = item.data;

    return <WalletsCarouselInformationView wallet={item} />;
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea>
        <SortableList
          ref={ref => (this.sortableList = ref)}
          style={{ flex: 1 }}
          data={this.state.data}
          renderRow={this._renderItem}
          onChangeOrder={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', false);
            this.setState({ hasMovedARow: true });
          }}
          onActivateRow={() => {
            ReactNativeHapticFeedback.trigger('selection', false);
          }}
          onReleaseRow={() => {
            ReactNativeHapticFeedback.trigger('impactLight', false);
          }}
        />
      </SafeBlueArea>
    );
  }
}

ReorderWallets.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    dismiss: PropTypes.func,
  }),
};
