import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { type CardStatus } from 'libportal-react-native';
import Button from '../components/Button.tsx';
import * as PortalDevice from '../blue_modules/portal-device.ts';
import { stopReading } from '../blue_modules/portal-device.ts';
import { BlueText } from '../BlueComponents';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import prompt from '../helpers/prompt.ts';
import loc from '../loc';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList.ts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RouteProps = RouteProp<DetailViewStackParamList, 'NfcSignPsbt'>;
type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'NfcSignPsbt'>;

function NfcSignPsbt() {
  const { launchedBy, onReturn, psbt } = useRoute<RouteProps>().params;
  console.log('route params:', { psbt });
  const navigation = useNavigation<NavigationProp>();
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [, setRedraw] = useState<number>(0);

  async function getStatus() {
    setStatus(await PortalDevice.getStatus());
  }

  useEffect(() => {
    console.log('NfcSignPsbt launched by', launchedBy);
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
      {/* <Button onPress={() => getStatus()} title="getStatus" /> */}

      {PortalDevice.isReading() ? (
        <BlueText>Reading the NFC...</BlueText>
      ) : (
        <View>
          <BlueText>Reading stopped</BlueText>
          <Button
            title="start reading NFC device"
            onPress={async () => {
              PortalDevice.startReading();
              setRedraw(Math.random());
            }}
          />
        </View>
      )}

      {status?.unlocked === false && status.initialized ? (
        <Button
          title="unlock portal"
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

      {status?.unlocked && status.initialized ? (
        <Button
          title="Sign the transaction"
          onPress={() => {
            console.log('trying to sign on device:', psbt);
            PortalDevice.signPsbt(psbt).then(signed => {
              console.log({ signed });
              // @ts-ignore wtf
              navigation.navigate({ name: launchedBy, params: {}, merge: true });
              onReturn(signed);
            });
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

export default NfcSignPsbt;
