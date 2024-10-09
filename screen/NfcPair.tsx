import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type CardStatus, Descriptors } from 'libportal-react-native';
import Button from '../components/Button.tsx';
import * as PortalDevice from '../blue_modules/portal-device.ts';
import { stopReading } from '../blue_modules/portal-device.ts';
import { BlueText } from '../BlueComponents';
import { useNavigation, useRoute } from '@react-navigation/native';
import prompt from '../helpers/prompt.ts';
import loc from '../loc';

let statusIntervalPaused = false;

function NfcPair() {
  // @ts-ignore wtf
  const { launchedBy, onReturn } = useRoute().params;
  const navigation = useNavigation();
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [, setRedraw] = useState<number>(0);

  /* async function getStatus() {
    setStatus(await PortalDevice.getStatus());
  } */

  useEffect(() => {
    console.log('NfcPair launched by', launchedBy);
    PortalDevice.init()?.then(() => setRedraw(Math.random()));

    // reading status from Portal device every few seconds
    const statusTimer = setInterval(() => {
      if (statusIntervalPaused) return;

      PortalDevice.getStatus()
        .then((stat: CardStatus) => {
          console.log('status returned: ', stat);
          setStatus(stat);
          setRedraw(Math.random());
        })
        .catch(console.error);
    }, 3000);

    // Cleanup function
    return () => {
      clearInterval(statusTimer);
      stopReading();
    };
  }, []);

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

      {/* {PortalDevice.isReading() ? (
        <Button
          title="stop reading NFC device"
          onPress={async () => {
            PortalDevice.stopReading();
            setRedraw(Math.random());
          }}
        />
      ) : (

      )} */}

      {status?.unlocked === false && status.initialized ? (
        <Button
          title="unlock portal"
          onPress={async () => {
            const password = await prompt(loc._.enter_password, '', true);
            if (password) {
              statusIntervalPaused = true;
              PortalDevice.unlock(password)
                .then(() => {
                  statusIntervalPaused = false;
                })
                .catch(alert);
            }
          }}
        />
      ) : null}

      {status?.unlocked && status.initialized ? (
        <Button
          title="Pair!"
          onPress={() => {
            statusIntervalPaused = true;
            PortalDevice.publicDescriptors()
              .then((data: Descriptors) => {
                console.log('publicDescriptors=', data);
                // @ts-ignore wtf
                navigation.navigate({ name: launchedBy, params: {}, merge: true });
                onReturn(data.external.toString());
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
