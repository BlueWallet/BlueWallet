import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View, BackHandler } from 'react-native';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
/** @type {AppStorage} */
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

export default class PleaseBackup extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.pleasebackup.title,
    headerLeft: null,
    headerRight: null,
  });

  constructor(props) {
    super(props);

    let secret = props.navigation.state.params.secret;
    let lines = {};
    let lineIndex = 1;
    let c = 1;
    lines[lineIndex] = '';
    for (let word of secret.split(' ')) {
      lines[lineIndex] += c + ') ' + word + ' ';
      if (c++ % 4 === 0) {
        lineIndex++;
        lines[lineIndex] = '';
      }
    }

    console.log(lines);

    this.state = {
      isLoading: true,
      qrCodeHeight: height > width ? width - 40 : width / 2,
      secret,
      lines,
      words: secret.split(' '),
    };
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  }

  handleBackButton() {
    this.props.navigation.dismiss();
    return true;
  }

  componentDidMount() {
    Privacy.enableBlur();
    this.setState({
      isLoading: false,
    });
  }

  componentWillUnmount() {
    Privacy.disableBlur();
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  }

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }} onLayout={this.onLayout}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueText style={{ padding: 20 }}>{loc.pleasebackup.text}</BlueText>
        <View style={{ flex: 0.5, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[0]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[1]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[2]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[3]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[4]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[5]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[6]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[7]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[8]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[9]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[10]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[11]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[12]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[13]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[14]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[15]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[16]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[17]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[18]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[19]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[20]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[21]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[22]}</BlueText>
            </View>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueText>{this.state.words[23]}</BlueText>
            </View>
          </View>
          <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row' }}>
            <View style={{ flex: 1, alignSelf: 'stretch' }}>
              <BlueSpacing20 />
              <BlueButton onPress={() => this.props.navigation.dismiss()} title={loc.pleasebackup.ok} />
            </View>
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

PleaseBackup.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
    dismiss: PropTypes.func,
  }),
};
