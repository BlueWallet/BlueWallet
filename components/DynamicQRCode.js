/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { Component } from 'react';
import { Text } from 'react-native-elements';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { encodeUR } from 'bc-ur/dist';
import QRCode from 'react-native-qrcode-svg';
import { BlueCurrentTheme } from '../components/themes';
import { BlueSpacing20 } from '../BlueComponents';
import loc from '../loc';

const { height, width } = Dimensions.get('window');

export class DynamicQRCode extends Component {
  constructor() {
    super();
    const qrCodeHeight = height > width ? width - 40 : width / 3;
    const qrCodeMaxHeight = 370;
    this.state = {
      index: 0,
      total: 0,
      qrCodeHeight: Math.min(qrCodeHeight, qrCodeMaxHeight),
      intervalHandler: null,
    };
  }

  fragments = [];

  componentDidMount() {
    const { value, capacity = 800, hideControls = true } = this.props;
    this.fragments = encodeUR(value, capacity);
    this.setState(
      {
        total: this.fragments.length,
        hideControls,
      },
      () => {
        this.startAutoMove();
      },
    );
  }

  moveToNextFragment = () => {
    const { index, total } = this.state;
    if (index === total - 1) {
      this.setState({
        index: 0,
      });
    } else {
      this.setState(state => ({
        index: state.index + 1,
      }));
    }
  };

  startAutoMove = () => {
    if (!this.state.intervalHandler)
      this.setState(() => ({
        intervalHandler: setInterval(this.moveToNextFragment, 500),
      }));
  };

  stopAutoMove = () => {
    clearInterval(this.state.intervalHandler);
    this.setState(() => ({
      intervalHandler: null,
    }));
  };

  moveToPreviousFragment = () => {
    const { index, total } = this.state;
    if (index > 0) {
      this.setState(state => ({
        index: state.index - 1,
      }));
    } else {
      this.setState(state => ({
        index: total - 1,
      }));
    }
  };

  render() {
    const currentFragment = this.fragments[this.state.index];

    if (!currentFragment) {
      return (
        <View>
          <Text>{loc.send.dynamic_init}</Text>
        </View>
      );
    }

    return (
      <View style={animatedQRCodeStyle.container}>
        <TouchableOpacity
          style={animatedQRCodeStyle.qrcodeContainer}
          onPress={() => {
            this.setState(prevState => ({ hideControls: !prevState.hideControls }));
          }}
        >
          <QRCode
            value={currentFragment.toUpperCase()}
            size={this.state.qrCodeHeight}
            color="#000000"
            logoBackgroundColor={BlueCurrentTheme.colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="L"
          />
        </TouchableOpacity>

        {!this.state.hideControls && (
          <View style={animatedQRCodeStyle.container}>
            <BlueSpacing20 />
            <View>
              <Text style={animatedQRCodeStyle.text}>
                {loc.formatString(loc._.of, { number: this.state.index + 1, total: this.state.total })}
              </Text>
            </View>
            <BlueSpacing20 />
            <View style={animatedQRCodeStyle.controller}>
              <TouchableOpacity
                style={[animatedQRCodeStyle.button, { width: '25%', alignItems: 'flex-start' }]}
                onPress={this.moveToPreviousFragment}
              >
                <Text style={animatedQRCodeStyle.text}>{loc.send.dynamic_prev}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[animatedQRCodeStyle.button, { width: '50%' }]}
                onPress={this.state.intervalHandler ? this.stopAutoMove : this.startAutoMove}
              >
                <Text style={animatedQRCodeStyle.text}>{this.state.intervalHandler ? loc.send.dynamic_stop : loc.send.dynamic_start}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[animatedQRCodeStyle.button, { width: '25%', alignItems: 'flex-end' }]}
                onPress={this.moveToNextFragment}
              >
                <Text style={animatedQRCodeStyle.text}>{loc.send.dynamic_next}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const animatedQRCodeStyle = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
    margin: 6,
  },
  controller: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 25,
    height: 45,
    paddingHorizontal: 18,
  },
  button: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: 'bold',
  },
});
