import React, { Component } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import loc from '../../loc';
import { SuccessView } from '../send/success';
import { popToTop } from '../../NavigationService';

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
      <SafeArea style={styles.root}>
        <ScrollView style={styles.container}>
          {justPaid && <SuccessView />}

          <BlueSpacing40 />
          <BlueText style={styles.alignSelfCenter}>{domain}</BlueText>
          <BlueText style={[styles.alignSelfCenter, styles.description]}>{description}</BlueText>
          {image && <Image style={styles.img} source={{ uri: image }} />}
          <BlueSpacing20 />

          {(preamble || url || message) && (
            <BlueCard>
              <View style={styles.successContainer}>
                <BlueText style={styles.successText}>{preamble}</BlueText>
                {url ? (
                  <BlueButtonLink
                    title={url}
                    onPress={() => {
                      Linking.openURL(url);
                    }}
                  />
                ) : (
                  <BlueText selectable>{message}</BlueText>
                )}
              </View>
            </BlueCard>
          )}

          <BlueCard>
            {repeatable ? (
              <Button
                onPress={() => {
                  this.props.navigation.navigate('ScanLndInvoiceRoot', {
                    screen: 'LnurlPay',
                    params: {
                      lnurl,
                      walletID: this.state.fromWalletID,
                    },
                  });
                }}
                title="repeat" // TODO: translate this
                icon={{ name: 'refresh', type: 'font-awesome', color: '#9aa0aa' }}
              />
            ) : (
              <Button
                onPress={() => {
                  popToTop();
                }}
                title={loc.send.success_done}
              />
            )}
          </BlueCard>
        </ScrollView>
      </SafeArea>
    );
  }
}

LnurlPaySuccess.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    pop: PropTypes.func,
    getParent: PropTypes.func,
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
  container: {
    paddingHorizontal: 16,
  },
  successContainer: {
    marginTop: 10,
  },
  successText: {
    textAlign: 'center',
    margin: 4,
  },
  description: {
    marginTop: 20,
  },
});
