import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { type CardStatus, Descriptors } from 'libportal-react-native';
import Button from '../components/Button.tsx';
import * as PortalDevice from '../blue_modules/portal-device.ts';
import { stopReading } from '../blue_modules/portal-device.ts';
import { BlueSpacing20, BlueText } from '../BlueComponents';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import prompt from '../helpers/prompt.ts';
import loc from '../loc';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList.ts';
import { MnemonicWords, Network } from 'libportal-react-native/src';
import presentAlert from '../components/Alert.ts';

type RouteProps = RouteProp<DetailViewStackParamList, 'NfcPair'>;
type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'NfcPair'>;

function NfcPair() {
  const { launchedBy, onReturn } = useRoute<RouteProps>().params;
  const navigation = useNavigation<NavigationProp>();
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [backdoor, setBackdoor] = useState<number>(0);
  const [, setRedraw] = useState<number>(0);

  async function getStatus() {
    const portalStatus = await PortalDevice.getStatus();
    console.log(portalStatus);
    setStatus(portalStatus);
  }

  const doPair = () => {
    PortalDevice.publicDescriptors()
      .then((data: Descriptors) => {
        console.log('publicDescriptors=', data);
        // @ts-ignore wtf
        navigation.navigate({ name: launchedBy, params: {}, merge: true });
        onReturn(data.external.toString());
      })
      .catch(alert);
  };

  useEffect(() => {
    console.log('NfcPair launched by', launchedBy);
    PortalDevice.startReading()?.then(() => {
      getStatus();
      setRedraw(Math.random());
    });

    // Cleanup function
    return () => {
      stopReading();
    };
  }, [launchedBy]);

  return (
    <View style={styles.wrapper}>
      {PortalDevice.isReading() ? (
        <BlueText onPress={() => setBackdoor(prevState => prevState + 1)}>Reading... Place phone on the NFC device</BlueText>
      ) : (
        <View>
          <BlueText>Reading stopped</BlueText>
          <Button
            title="start reading NFC device"
            onPress={async () => {
              PortalDevice.startReading()?.then(() => {
                getStatus();
                setRedraw(Math.random());
              });
            }}
          />
        </View>
      )}

      {backdoor >= 20 && PortalDevice.isReading() ? (
        <Button
          title="stop reading NFC device"
          onPress={async () => {
            PortalDevice.stopReading().then(() => {
              presentAlert({ title: '', message: 'Remove the device' });
              setRedraw(Math.random());
            });
          }}
        />
      ) : null}

      {status?.unlocked === false && status.initialized ? (
        <Button
          title="unlock Portal"
          onPress={async () => {
            const password = await prompt(loc._.enter_password, '', true);
            if (password) {
              PortalDevice.unlock(password)
                .then(() => getStatus())
                .catch(alert);
            }
          }}
        />
      ) : null}

      <BlueSpacing20 />

      {status?.unlocked && status.initialized ? (
        <Button
          title="Pair!"
          onPress={() => {
            doPair();
          }}
        />
      ) : null}

      <BlueSpacing20 />

      {status && !status.initialized && !status.unverified ? (
        <Button
          title="Initialize device"
          onPress={async () => {
            const password = await prompt('Set device unlock pin', '', true);
            if (!password) return;
            const password2 = await prompt('Repeat device unlock pin', '', true);
            if (password !== password2) return;

            PortalDevice.generateMnemonic(MnemonicWords.Words12, Network.Bitcoin, password)
              .then(() => {
                console.log('generateMnemonic succeeded');
                doPair();
              })
              .catch(alert);
          }}
        />
      ) : null}

      {status && !status.initialized && status.unverified ? (
        <Button
          title="Continue pairing the device"
          onPress={async () => {
            PortalDevice.resume()
              .then(() => {
                console.log('resume succeeded');
                doPair();
              })
              .catch(alert);
          }}
        />
      ) : null}

      <BlueSpacing20 />

      {backdoor >= 20 && status?.unlocked && status.initialized ? (
        <Button
          title="debugWipeDevice"
          onPress={() => {
            PortalDevice.debugWipeDevice()
              .then(() => {
                console.log('debugWipeDevice success');
              })
              .catch(alert);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NfcPair;
