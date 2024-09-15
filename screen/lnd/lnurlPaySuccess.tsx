import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import loc from '../../loc';
import { SuccessView } from '../send/success';
import { popToTop } from '../../NavigationService';
import { useRoute, RouteProp } from '@react-navigation/native';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation.ts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type LnurlPaySuccessRouteProp = RouteProp<DetailViewStackParamList, 'LnurlPaySuccess'>;
type LnurlPaySuccessNavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'LnurlPaySuccess'>;

const LnurlPaySuccess: React.FC = () => {
  const route = useRoute<LnurlPaySuccessRouteProp>();
  const { navigate } = useExtendedNavigation<LnurlPaySuccessNavigationProp>();
  const { paymentHash, fromWalletID, justPaid } = route.params;
  console.log({ paymentHash, fromWalletID, justPaid });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [LN, setLN] = useState<Lnurl | null>(null);
  const [preamble, setPreamble] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const loadSuccessfulPayment = async () => {
      const lnurl = new Lnurl(false, AsyncStorage);
      await lnurl.loadSuccessfulPayment(paymentHash);

      const successAction = lnurl.getSuccessAction();
      if (!successAction) {
        setIsLoading(false);
        setLN(lnurl);
        return;
      }

      switch (successAction.tag) {
        case 'aes': {
          const preimage = lnurl.getPreimage();
          if (!preimage) {
            break;
          }
          setMessage(Lnurl.decipherAES(successAction.ciphertext, preimage, successAction.iv));
          setPreamble(successAction.description);
          break;
        }
        case 'url':
          setUrl(successAction.url);
          setPreamble(successAction.description);
          break;
        case 'message':
          setMessage(successAction.message);
          break;
      }

      setIsLoading(false);
      setLN(lnurl);
    };

    loadSuccessfulPayment();
  }, [paymentHash]);

  if (isLoading || !LN) {
    return <BlueLoading />;
  }

  const domain = LN.getDomain();
  const repeatable = !LN.getDisposable();
  const lnurl = LN.getLnurl();
  const description = LN.getDescription();
  const image = LN.getImage();

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
                navigate('ScanLndInvoiceRoot', {
                  screen: 'LnurlPay',
                  params: {
                    // @ts-ignore  fixme
                    lnurl,
                    walletID: fromWalletID,
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

export default LnurlPaySuccess;
