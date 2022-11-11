import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, Linking, StyleSheet, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BlueButton,
  BlueButtonLink,
  BlueCard,
  BlueLoading,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
  SafeBlueArea,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Lnurl from '../../class/lnurl';
import loc from '../../loc';
import { SuccessView } from '../send/success';

export default class LnurlPaySuccess extends Component {
  constructor(props) {
    super(props);

    const paymentHash = props.route.params.paymentHash;
    const fromWalletID = props.route.params.fromWalletID;
    const justPaid = !!props.route.params.justPaid;

    this.state = {
      paymentHash,
      isLoading: true,
      fromWalletID,
      justPaid,
    };
  }

  async componentDidMount() {
    const LN = new Lnurl(false, AsyncStorage);
    await LN.loadSuccessfulPayment(this.state.paymentHash);

    const successAction = LN.getSuccessAction();
    if (!successAction) {
      this.setState({ isLoading: false, LN });
      return;
    }

    const newState = { LN, isLoading: false };

    switch (successAction.tag) {
      case 'aes': {
        const preimage = LN.getPreimage();
        newState.message = Lnurl.decipherAES(successAction.ciphertext, preimage, successAction.iv);
        newState.preamble = successAction.description;
        break;
      }
      case 'url':
        newState.url = successAction.url;
        newState.preamble = successAction.description;
        break;
      case 'message':
        this.setState({ message: successAction.message });
        newState.message = successAction.message;
        break;
    }

    this.setState(newState);
  }

  render() {
    if (this.state.isLoading || !this.state.LN) {
      return <BlueLoading />;
    }

    /** @type {Lnurl} */
    const LN = this.state.LN;
    const domain = LN.getDomain();
    const repeatable = !LN.getDisposable();
    const lnurl = LN.getLnurl();
    const description = LN.getDescription();
    const image = LN.getImage();
    const { preamble, message, url, justPaid } = this.state;

    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView>
          {justPaid && <SuccessView />}

          <BlueSpacing40 />

          <BlueSpacing40 />
          <BlueText style={styles.alignSelfCenter}>{domain}</BlueText>
          <BlueText style={styles.alignSelfCenter}>{description}</BlueText>
          {image && <Image style={styles.img} source={{ uri: image }} />}
          <BlueSpacing20 />

          {(preamble || url || message) && (
            <BlueCard>
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{preamble}</Text>
                {url ? (
                  <BlueButtonLink
                    title={url}
                    onPress={() => {
                      Linking.openURL(url);
                    }}
                  />
                ) : (
                  <Text selectable style={{ ...styles.successText, ...styles.successValue }}>
                    {message}
                  </Text>
                )}
              </View>
            </BlueCard>
          )}

          <BlueCard>
            {repeatable ? (
              <BlueButton
                onPress={() => {
                  this.props.navigation.navigate('ScanLndInvoiceRoot', {
                    screen: 'LnurlPay',
                    params: {
                      lnurl,
                      walletID: this.state.fromWalletID,
                    },
                  });
                }}
                title="repeat"
                icon={{ name: 'refresh', type: 'font-awesome', color: '#9aa0aa' }}
              />
            ) : (
              <BlueButton
                onPress={() => {
                  this.props.navigation.dangerouslyGetParent().popToTop();
                }}
                title={loc.send.success_done}
              />
            )}
          </BlueCard>
        </ScrollView>
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
      paymentHash: PropTypes.string.isRequired,
      fromWalletID: PropTypes.string.isRequired,
      justPaid: PropTypes.bool.isRequired,
    }),
  }),
};

const styles = StyleSheet.create({
  img: { width: 200, height: 200, alignSelf: 'center' },
  alignSelfCenter: {
    alignSelf: 'center',
  },
  root: {
    padding: 0,
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
});

LnurlPaySuccess.navigationOptions = navigationStyle({
  title: '',
  closeButton: true,
  headerHideBackButton: true,
  gestureEnabled: false,
  closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().popToTop(),
});
