import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';

export default class HodlHodlWebview extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'HodlHodl Contract',
    headerLeft: null,
  });

  constructor(props) {
    super(props);

    let uri = props.route.params.uri;

    this.state = {
      uri,
    };
  }

  render() {
    return (
      <SafeBlueArea>
        <WebView source={{ uri: this.state.uri }} incognito />
      </SafeBlueArea>
    );
  }
}

HodlHodlWebview.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      uri: PropTypes.string.isRequired,
    }),
  }),
};
