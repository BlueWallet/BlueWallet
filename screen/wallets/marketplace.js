import React, { Component } from 'react';
import { BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlueLoading, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';

export default class Marketplace extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'Marketplace',
    headerLeft: null,
  });

  webview = React.createRef();

  constructor(props) {
    super(props);
    if (!props.navigation.getParam('fromWallet')) throw new Error('Invalid param');
    let fromWallet = props.navigation.getParam('fromWallet');

    this.state = {
      url: '',
      fromWallet,
      canGoBack: false,
    };
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);
  }

  async componentDidMount() {
    let address;
    if (this.state.fromWallet && this.state.fromWallet.getAddressAsync) {
      address = await this.state.fromWallet.getAddressAsync();
    } else if (this.state.fromWallet && this.state.fromWallet.getAddress) {
      address = this.state.fromWallet.getAddress();
    }

    const url = 'https://bluewallet.io/marketplace-btc/?address=' + address; // default

    this.setState({
      url,
    });
  }

  componentWillUnmount = () => {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton);
  };

  handleBackButton = () => {
    this.state.canGoBack ? this.webview.current.goBack() : this.props.navigation.goBack(null);
    return true;
  };

  _onNavigationStateChange = webViewState => {
    this.setState({ canGoBack: webViewState.canGoBack });
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <WebView
        ref={this.webview}
        onNavigationStateChange={this._onNavigationStateChange}
        source={{
          uri: this.state.url,
        }}
      />
    );
  }
}

Marketplace.propTypes = {
  navigation: PropTypes.shape({
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
