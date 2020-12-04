import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import PropTypes from 'prop-types';

import { SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';

export default class HodlHodlWebview extends Component {
  constructor(props) {
    super(props);

    const uri = props.route.params.uri;

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

HodlHodlWebview.navigationOptions = navigationStyle({
  closeButton: true,
  title: '',
  headerLeft: null,
});
