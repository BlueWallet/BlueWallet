import React from 'react';
import NavigationService from './NavigationService';
import WalletMigrateStackNavigator from './MainBottomTabs';

export default class App extends React.Component {
  navigator = null;

  render() {
    return (
      <WalletMigrateStackNavigator
        ref={nav => {
          this.navigator = nav;
          NavigationService.setTopLevelNavigator(nav);
        }}
      />
    );
  }
}
