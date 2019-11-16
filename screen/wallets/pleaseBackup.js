import React, { Component } from 'react';
import { ActivityIndicator, View, BackHandler, Text } from 'react-native';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton } from '../../BlueComponents';
import { Badge } from 'react-native-elements';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import { ScrollView } from 'react-native-gesture-handler';
let loc = require('../../loc');

export default class PleaseBackup extends Component {
  static navigationOptions = ({ navigation }) => ({
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
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
            <BlueText style={{ textAlign: 'center', fontWeight: 'bold', color: '#0C2550' }}>{loc.pleasebackup.success}</BlueText>
            <BlueText style={{ paddingBottom: 20, paddingRight: 20, paddingLeft: 20, color: '#0C2550' }}>{loc.pleasebackup.text}</BlueText>

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: 24,
              }}
            >
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>1. {this.state.words[0]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>2. {this.state.words[1]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>3. {this.state.words[2]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>4. {this.state.words[3]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>5. {this.state.words[4]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>6. {this.state.words[5]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>7. {this.state.words[6]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>8. {this.state.words[7]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>9. {this.state.words[8]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>10. {this.state.words[9]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>11. {this.state.words[10]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>12. {this.state.words[11]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>13. {this.state.words[12]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>14. {this.state.words[13]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>15. {this.state.words[14]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>16. {this.state.words[15]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>17. {this.state.words[16]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>18. {this.state.words[17]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>19. {this.state.words[18]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>20. {this.state.words[19]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>21. {this.state.words[20]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>22. {this.state.words[21]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>23. {this.state.words[22]}</Text>
                </Badge>
              </View>
              <View style={{ width: 'auto', marginRight: 8, marginBottom: 8 }}>
                <Badge
                  containerStyle={{
                    backgroundColor: '#f5f5f5',
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#81868E', fontWeight: 'bold' }}>24. {this.state.words[23]}</Text>
                </Badge>
              </View>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', paddingTop: 24, paddingBottom: 40 }}>
              <View style={{ flex: 1 }}>
                <BlueSpacing20 />
                <BlueButton onPress={() => this.props.navigation.dismiss()} title={loc.pleasebackup.ok} />
              </View>
            </View>
          </View>
        </ScrollView>
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
