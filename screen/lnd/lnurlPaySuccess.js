import React, { Component } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { View, Text, Image, ScrollView, Linking, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { decipherAES } from 'js-lnurl'
import {
  BlueButton,
  BlueButtonLink,
  BlueNavigationStyle,
  SafeBlueArea,
  BlueCard,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  descriptionScroll: {
    height: 120,
  },
  descriptionText: {
    color: '#81868e',
    fontWeight: '500',
    fontSize: 14,
  },
  imageContainer: {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    maxWidth: 120,
    maxHeight: 120,
    padding: 0,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginVertical: 13,
    textAlign: 'center',
    flex: 1,
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
  },
  successText: {
    margin: 3
  },
  successValue: {
    textAlign: 'center',
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
      title: route.params.domain + ' message',
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
    const { image, description, repeatable, lnurl } = this.props.route.params;
    const { preamble, message, url } = this.state;

    return (
      <SafeBlueArea style={styles.root}>
        <BlueCard>
          <View style={styles.descriptionScroll}>
            <ScrollView>
              <Text style={styles.descriptionText}>
                {description}
              </Text>
            </ScrollView>
          </View>
        </BlueCard>

        <View style={styles.imageContainer}>
          {image
            ? <Image style={styles.image} source={{uri: image}} />
            : <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
          }
        </View>

        {(preamble || url || message) && (
          <BlueCard>
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
