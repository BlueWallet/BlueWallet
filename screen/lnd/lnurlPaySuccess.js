import React, { Component } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { View, Text, Image, ScrollView, Linking } from 'react-native';
import { Icon } from 'react-native-elements';
import { decipherAES } from 'js-lnurl'
import { BlueButton, BlueButtonLink, SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
let loc = require('../../loc');

export default class Success extends Component {
  static navigationOptions = {
    header: null,
    gesturesEnabled: false,
  };

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

    const successAction = this.props.navigation.getParam('successAction');
    if (!successAction) return

    switch (successAction.tag) {
      case 'aes':
        const preimage = this.props.navigation.getParam('preimage');
        let message = decipherAES(successAction, preimage);
        this.setState({message, preamble: successAction.description});
        break;
      case 'url':
        this.setState({url: successAction.url, preamble: successAction.description});
        break;
      case 'message':
        this.setState({message: successAction.message});
        break;
    }
  }

  render() {
    const domain = this.props.navigation.getParam('domain');
    const image = this.props.navigation.getParam('image');
    const description = this.props.navigation.getParam('description');
    const lnurlString = this.props.navigation.getParam('lnurl');
    const {preamble, message, url} = this.state;

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueText style={{ textAlign: 'center', fontWeight: 'bold' }}>
            {domain}
          </BlueText>
        </BlueCard>

        <BlueCard>
          <ScrollView contentContainerStyle={{maxHeight: 120}}>
            <Text numberOfLines={0} style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>
              {description}
            </Text>
          </ScrollView>
        </BlueCard>

        <View
          style={{
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
          }}
          >
          {image
            ? <Image style={{ width: 80, height: 80 }} source={{uri: image}} />
            : <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
          }
        </View>

        {(preamble || url || message) && (
          <BlueCard>
            <Text style={{ margin: 3 }}>{preamble}</Text>
            {url
              ? <BlueButtonLink title={url} onPress={() => {
                  Linking.openURL(url)
                }} />
              : (
                <Text
                  selectable
                  style={{ margin: 3, textAlign: 'center', fontWeight: 'bold' }}>
                  {message}
                </Text>
              )
            }
          </BlueCard>
        )}

        <BlueCard>
          {lnurlString
            ? (
              <BlueButton
                onPress={() => {
                  this.props.navigation.navigate('ScanLndInvoice', {
                    uri: lnurlString,
                    fromWallet: this.props.navigation.getParam('fromWallet')
                  });
                }}
                title={loc.send.success.lnurlpay_repeat}
                icon={{name: 'refresh', type: 'font-awesome', color: '#9aa0aa'}}
              />
              )
            : (
              <BlueButton
                onPress={() => {
                  this.props.navigation.dismiss();
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

Success.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        image: PropTypes.string,
        description: PropTypes.string,
        domain: PropTypes.string,
        successAction: PropTypes.shape({}),
        preimage: PropTypes.string,

        // not present immediatelly after a success payment
        lnurl: PropTypes.string,
        fromWallet: PropTypes.shape({}),
      }),
    }),
  }),
};
