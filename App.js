import React from 'react';
import { Linking } from 'react-native';
import { NavigationActions } from 'react-navigation';

import MainBottomTabs from './MainBottomTabs';

export default class App extends React.Component {
  navigator = null;

  componentDidMount() {
    Linking.getInitialURL()
      .then(url => this.handleOpenURL({ url }))
      .catch(console.error);

    Linking.addEventListener('url', this.handleOpenURL);
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
  }

  handleOpenURL = event => {
    if (event.url && event.url.indexOf('bitcoin:') === 0) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'SendDetails',
            params: {
              uri: event.url,
            },
          }),
        );
    }
  };

  render() {
    return (
      <MainBottomTabs
        ref={nav => {
          this.navigator = nav;
        }}
      />
    );
  }
}
