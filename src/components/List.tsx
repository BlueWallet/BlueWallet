//to refactor
import React, { Component } from 'react';
import { List } from 'react-native-elements';

import { BlueApp } from 'app/legacy';

export class BlueList extends Component {
  render() {
    return (
      <List
        {...this.props}
        containerStyle={{
          backgroundColor: BlueApp.settings.brandingColor,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          flex: 1,
        }}
      />
    );
  }
}
