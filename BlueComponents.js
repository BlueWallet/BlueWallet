/* eslint react/prop-types: 0 */
import React, { Component } from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Icon, Text, Header } from 'react-native-elements';

const BlueApp = require('./BlueApp');

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
    let backgroundColor = this.props.backgroundColor
      ? this.props.backgroundColor
      : BlueApp.settings.buttonBackgroundColor;
    let fontColor = BlueApp.settings.buttonTextColor;
    if (this.props.hasOwnProperty('disabled') && this.props.disabled === true) {
      backgroundColor = BlueApp.settings.buttonDisabledBackgroundColor;
      fontColor = BlueApp.settings.buttonDisabledTextColor;
    }
    let buttonWidth = width / 1.5;
    if (this.props.hasOwnProperty('noMinWidth')) {
      buttonWidth = 0;
    }
    return (
      <TouchableOpacity
        style={{
          flex: 1,
          borderWidth: 0.7,
          borderColor: 'transparent',
          backgroundColor: backgroundColor,
          minHeight: 45,
          height: 45,
          maxHeight: 45,
          borderRadius: 25,
          minWidth: buttonWidth,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        {...this.props}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {this.props.icon && (
            <Icon name={this.props.icon.name} type={this.props.icon.type} color={this.props.icon.color} />
          )}
          {this.props.title && (
            <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{this.props.title}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueText extends Component {
  render() {
    return (
      <Text
        style={{
          color: BlueApp.settings.foregroundColor,

          // eslint-disable-next-line
          ...this.props.style,
        }}
        {...this.props}
      />
    );
  }
}
export class BlueTextCentered extends Component {
  render() {
    return <Text {...this.props} style={{ color: BlueApp.settings.foregroundColor, textAlign: 'center' }} />;
  }
}

export class BlueHeader extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor="transparent"
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
      />
    );
  }
}
