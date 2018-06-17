/** @type {AppStorage} */
import React, { Component } from 'react';
import { SafeAreaView } from 'react-navigation';
import {
  Button,
  FormLabel,
  FormInput,
  Card,
  Text,
  Header,
  List,
  ListItem,
} from 'react-native-elements';
import { ActivityIndicator, ListView, View, Dimensions } from 'react-native';
/** @type {AppStorage} */
let BlueApp = require('./BlueApp');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export class BlueButton extends Component {
  render() {
    return (
      <Button
        {...this.props}
        style={{
          marginTop: 20,
          borderRadius: 6,
          borderWidth: 0.7,
          borderColor: BlueApp.settings.foregroundColor,
        }}
        borderRadius={10}
        backgroundColor={BlueApp.settings.buttonBackground}
        color={BlueApp.settings.buttonTextColor}
      />
    );
  }
  /* icon={{name: 'home', type: 'octicon'}} */
}

export class SafeBlueArea extends Component {
  render() {
    return (
      <SafeAreaView
        {...this.props}
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueCard extends Component {
  render() {
    return (
      <Card
        {...this.props}
        titleStyle={{ color: BlueApp.settings.foregroundColor }}
        containerStyle={{ backgroundColor: BlueApp.settings.brandingColor }}
        wrapperStyle={{ backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueText extends Component {
  render() {
    return (
      <Text
        {...this.props}
        style={{ color: BlueApp.settings.foregroundColor }}
      />
    );
  }
}

export class BlueListItem extends Component {
  render() {
    return (
      <ListItem
        {...this.props}
        containerStyle={{
          backgroundColor: BlueApp.settings.brandingColor,
          borderBottomColor: BlueApp.settings.foregroundColor,
          borderBottomWidth: 0.5,
        }}
        titleStyle={{ color: BlueApp.settings.foregroundColor, fontSize: 18 }}
        subtitleStyle={{ color: BlueApp.settings.foregroundColor }}
      />
    );
  }
}

export class BlueFormLabel extends Component {
  render() {
    return (
      <FormLabel
        {...this.props}
        labelStyle={{ color: BlueApp.settings.foregroundColor }}
      />
    );
  }
}

export class BlueFormInput extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{ color: BlueApp.settings.foregroundColor }}
        containerStyle={{
          borderBottomColor: BlueApp.settings.foregroundColor,
          borderBottomWidth: 0.5,
        }}
      />
    );
  }
}

export class BlueFormInputAddress extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{
          color: BlueApp.settings.foregroundColor,
          fontSize: (isIpad && 10) || 12,
        }}
        containerStyle={{
          borderBottomColor: BlueApp.settings.foregroundColor,
          borderBottomWidth: 0.5,
        }}
      />
    );
  }
}

export class BlueHeader extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor={BlueApp.settings.brandingColor}
      />
    );
  }
}

export class BlueSpacing extends Component {
  render() {
    return (
      <View
        {...this.props}
        style={{ height: 60, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}
export class BlueSpacing40 extends Component {
  render() {
    return (
      <View
        {...this.props}
        style={{ height: 50, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueSpacing20 extends Component {
  render() {
    return (
      <View
        {...this.props}
        style={{ height: 20, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueListView extends Component {
  render() {
    return <ListView {...this.props} />;
  }
}

export class BlueList extends Component {
  render() {
    return (
      <List
        {...this.props}
        containerStyle={{
          backgroundColor: BlueApp.settings.brandingColor,
          borderTopColor: BlueApp.settings.foregroundColor,
          borderTopWidth: 1,
        }}
      />
    );
  }
}

export class BlueView extends Component {
  render() {
    return (
      <View
        {...this.props}
        containerStyle={{ backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueLoading extends Component {
  render() {
    return (
      <SafeBlueArea>
        <View style={{ flex: 1, paddingTop: 200 }}>
          <ActivityIndicator />
        </View>
      </SafeBlueArea>
    );
  }
}
