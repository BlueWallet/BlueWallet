import React, { Component } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LottieView from 'lottie-react-native';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { decipherAES } from 'js-lnurl'
import {
  BlueButton,
  BlueButtonLink,
  BlueNavigationStyle,
  SafeBlueArea,
  BlueCard,
  LnurlPayMetadata,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  iconContainer: {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    maxWidth: 120,
    maxHeight: 120,
    padding: 0,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 400,
    height: 400,
  },
  successContainer: {
    marginTop: 10,
  },
  successText: {
    textAlign: 'center',
    margin: 4,
  },
  successValue: {
    fontWeight: 'bold',
  },
})

export default class LnurlPaySuccess extends Component {
  static navigationOptions = ({ navigation, route }) => {
    const base = {
      ...BlueNavigationStyle(
        navigation,
        true,
        () => route.params.justPaid
          ? navigation.dangerouslyGetParent().pop()
          : navigation.pop(),
      ),
      title: route.params.domain + ' success',
    }

    return route.params.lnurl
      ? base
      : {...base, headerLeft: null}
  }

  constructor(props) {
    super(props);

    this.state = {
      preamble: null,
      message: null,
      url: null
    };
  }

  async componentDidMount() {
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });

    const successAction = this.props.route.params.successAction;
    if (!successAction) return

    switch (successAction.tag) {
      case 'aes': {
        const preimage = this.props.route.params.preimage;
        const message = decipherAES(successAction, preimage);
        this.setState({message, preamble: successAction.description});
        break;
      }
      case 'url':
        this.setState({url: successAction.url, preamble: successAction.description});
        break;
      case 'message':
        this.setState({message: successAction.message});
        break;
    }
  }

  render() {
    const {image, description, domain, repeatable, lnurl, justPaid} = this.props.route.params;
    const {preamble, message, url} = this.state;

    return (
      <SafeBlueArea style={styles.root}>
        <LnurlPayMetadata domain={domain} description={description} image={image} />

        {justPaid
          ? (
            <View style={styles.iconContainer}>
              <LottieView style={styles.icon} source={require('../../img/bluenice.json')} autoPlay loop={false} />
            </View>
          )
          : (
            <View style={styles.iconContainer}>
              <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
            </View>
          )
        }

        {(preamble || url || message) && (
          <BlueCard>
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{preamble}</Text>
              {url
                ? <BlueButtonLink title={url} onPress={() => {
                    Linking.openURL(url)
                  }} />
                : (
                  <Text selectable style={{...styles.successText, ...styles.successValue}}>
                    {message}
                  </Text>
                )
              }
            </View>
          </BlueCard>
        )}

        <BlueCard>
          {(lnurl && repeatable)
            ? (
              <BlueButton
                onPress={() => {
                  this.props.navigation.navigate('ScanLndInvoiceRoot', {
                    screen: 'ScanLndInvoice',
                    params: {
                      uri: lnurl,
                      fromSecret: this.props.route.params.fromSecret
                    }
                  });
                }}
                title={loc.send.success.lnurlpay_repeat}
                icon={{name: 'refresh', type: 'font-awesome', color: '#9aa0aa'}}
              />
              )
            : (
              <BlueButton
                onPress={() => {
                  this.props.route.params.justPaid
                    ? this.props.navigation.dangerouslyGetParent().pop()
                    : this.props.navigation.pop();
                }}
                title={loc.send.success.done}
              />
              )
          }
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

LnurlPaySuccess.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    pop: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      image: PropTypes.string,
      description: PropTypes.string,
      domain: PropTypes.string,
      successAction: PropTypes.shape({
        tag: PropTypes.string,
        description: PropTypes.string,
        url: PropTypes.string,
        message: PropTypes.string,
      }),
      preimage: PropTypes.string,

      // not present immediatelly after a success payment
      lnurl: PropTypes.string,
      fromSecret: PropTypes.string,
      repeatable: PropTypes.bool,

      // only present after a success payment
      justPaid: PropTypes.boolean,
    }),
  }),
};
