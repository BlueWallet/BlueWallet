import React, {Component} from 'react';
import {ActivityIndicator, View, BackHandler, Text} from 'react-native';
import {BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
let loc = require('../../loc');

export default class PleaseBackup extends Component {
  static navigationOptions = ({navigation}) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.pleasebackup.title,
    headerLeft: null,
    headerRight: null,
  });

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      words: props.navigation.state.params.secret.split(' '),
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

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{flex: 1, paddingTop: 20}}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{flex: 1, paddingTop: 20}}>
        <BlueText style={{padding: 20}}>{loc.pleasebackup.text}</BlueText>
        <View style={{flex: 0.5, alignItems: 'center', justifyContent: 'center', padding: 20}}>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>1. </Text>
                {this.state.words[0]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>2. </Text>
                {this.state.words[1]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>3. </Text>
                {this.state.words[2]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>4. </Text>
                {this.state.words[3]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>5. </Text>
                {this.state.words[4]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>6. </Text>
                {this.state.words[5]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>7. </Text>
                {this.state.words[6]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>8. </Text>
                {this.state.words[7]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>9. </Text>
                {this.state.words[8]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>10. </Text>
                {this.state.words[9]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>11. </Text>
                {this.state.words[10]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>12. </Text>
                {this.state.words[11]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>13. </Text>
                {this.state.words[12]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>14. </Text>
                {this.state.words[13]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>15. </Text>
                {this.state.words[14]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>16. </Text>
                {this.state.words[15]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>17. </Text>
                {this.state.words[16]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>18. </Text>
                {this.state.words[17]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>19. </Text>
                {this.state.words[18]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>20. </Text>
                {this.state.words[19]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>21. </Text>
                {this.state.words[20]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>22. </Text>
                {this.state.words[21]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>23. </Text>
                {this.state.words[22]}
              </BlueText>
            </View>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
              <BlueText>
                <Text style={{color: 'gray'}}>24. </Text>
                {this.state.words[23]}
              </BlueText>
            </View>
          </View>
          <View style={{flex: 1, alignSelf: 'stretch', flexDirection: 'row'}}>
            <View style={{flex: 1, alignSelf: 'stretch'}}>
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
