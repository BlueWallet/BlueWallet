/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { Component } from 'react';
import { BlueCurrentTheme } from './themes';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-elements';

const { width } = Dimensions.get('window');

export class SquareButton extends Component {
  render() {
    let backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : BlueCurrentTheme.colors.buttonBlueBackgroundColor;
    let fontColor = BlueCurrentTheme.colors.buttonTextColor;
    if (this.props.disabled === true) {
      backgroundColor = BlueCurrentTheme.colors.buttonDisabledBackgroundColor;
      fontColor = BlueCurrentTheme.colors.buttonDisabledTextColor;
    }
    let buttonWidth = this.props.width ? this.props.width : width / 1.5;
    if ('noMinWidth' in this.props) {
      buttonWidth = 0;
    }
    return (
      <TouchableOpacity
        style={{
          flex: 1,
          borderWidth: 0.7,
          borderColor: 'transparent',
          backgroundColor: backgroundColor,
          minHeight: 50,
          height: 50,
          maxHeight: 50,
          borderRadius: 10,
          minWidth: buttonWidth,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        {...this.props}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          {this.props.icon && <Icon name={this.props.icon.name} type={this.props.icon.type} color={this.props.icon.color} />}
          {this.props.title && <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{this.props.title}</Text>}
        </View>
      </TouchableOpacity>
    );
  }
}
