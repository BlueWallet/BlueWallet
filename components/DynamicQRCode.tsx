import React, { Component } from 'react';
import { Text } from 'react-native-elements';
import { Dimensions, LayoutAnimation, StyleSheet, TouchableOpacity, View } from 'react-native';
import { encodeUR } from '../blue_modules/ur';
import QRCodeComponent from './QRCodeComponent';
import { BlueCurrentTheme } from '../components/themes';
import { BlueSpacing20 } from '../BlueComponents';
import loc from '../loc';

const { height, width } = Dimensions.get('window');

interface DynamicQRCodeProps {
  value: string;
  capacity?: number;
  hideControls?: boolean;
}

interface DynamicQRCodeState {
  index: number;
  total: number;
  qrCodeHeight: number;
  intervalHandler: ReturnType<typeof setInterval> | number | null;
  displayQRCode: boolean;
  hideControls?: boolean;
}

export class DynamicQRCode extends Component<DynamicQRCodeProps, DynamicQRCodeState> {
  constructor(props: DynamicQRCodeProps) {
    super(props);
    const qrCodeHeight = height > width ? width - 40 : width / 3;
    const qrCodeMaxHeight = 370;
    this.state = {
      index: 0,
      total: 0,
      qrCodeHeight: Math.min(qrCodeHeight, qrCodeMaxHeight),
      intervalHandler: null,
      displayQRCode: true,
    };
  }

  fragments: string[] = [];

  componentDidMount() {
    const { value, capacity = 200, hideControls = true } = this.props;
    try {
      this.fragments = encodeUR(value, capacity);
      this.setState(
        {
          total: this.fragments.length,
          hideControls,
          displayQRCode: true,
        },
        () => {
          this.startAutoMove();
        },
      );
    } catch (e) {
      console.log(e);
      this.setState({ displayQRCode: false, hideControls });
    }
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
    clearInterval(this.state.intervalHandler as number);
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

  onError = () => {
    console.log('Data is too large for QR Code.');
    this.setState({ displayQRCode: false });
  };

  render() {
    const currentFragment = this.fragments[this.state.index];

    if (!currentFragment && this.state.displayQRCode) {
      return (
        <View>
          <Text>{loc.send.dynamic_init}</Text>
        </View>
      );
    }

    return (
      <View style={animatedQRCodeStyle.container}>
        <TouchableOpacity
          accessibilityRole="button"
          testID="DynamicCode"
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            this.setState(prevState => ({ hideControls: !prevState.hideControls }));
          }}
        >
          {this.state.displayQRCode && (
            <View style={animatedQRCodeStyle.qrcodeContainer}>
              <QRCodeComponent
                isLogoRendered={false}
                value={currentFragment.toUpperCase()}
                size={this.state.qrCodeHeight}
                isMenuAvailable={false}
                ecl="L"
                onError={this.onError}
              />
            </View>
          )}
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
                accessibilityRole="button"
                style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonPrev]}
                onPress={this.moveToPreviousFragment}
              >
                <Text style={animatedQRCodeStyle.text}>{loc.send.dynamic_prev}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonStopStart]}
                onPress={this.state.intervalHandler ? this.stopAutoMove : this.startAutoMove}
              >
                <Text style={animatedQRCodeStyle.text}>{this.state.intervalHandler ? loc.send.dynamic_stop : loc.send.dynamic_start}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonNext]}
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
  buttonPrev: {
    width: '25%',
    alignItems: 'flex-start',
  },
  buttonStopStart: {
    width: '50%',
  },
  buttonNext: {
    width: '25%',
    alignItems: 'flex-end',
  },
  text: {
    fontSize: 14,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: 'bold',
  },
});
