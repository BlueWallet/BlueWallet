import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { PortalSdk, type NfcOut, type CardStatus } from 'libportal';
import Button from '../../components/Button.tsx';

const sdk = new PortalSdk(true);
let keepReading = true;

function livenessCheck(): Promise<NfcOut> {
  return new Promise((_resolve, reject) => {
    const interval = setInterval(() => {
      NfcManager.getTag()
        .then(() => NfcManager.transceive([0x30, 0xed]))
        .catch(() => {
          NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
          clearInterval(interval);

          reject(new Error('Removed tag'));
        });
    }, 250);
  });
}

async function manageTag() {
  await sdk.newTag();
  const check = livenessCheck();

  while (keepReading) {
    const msg = await Promise.race([sdk.poll(), check]);
    // console.trace('>', msg.data);
    const result = await NfcManager.nfcAHandler.transceive(msg.data);
    // console.trace('<', result);
    await sdk.incomingData(msg.msgIndex, result);
    await new Promise(resolve => setTimeout(resolve, 250)); // chance for UI to propagate
  }
}

async function listenForTags() {
  while (keepReading) {
    console.info('Looking for a Portal...');

    try {
      await NfcManager.registerTagEvent();
      await NfcManager.requestTechnology(NfcTech.NfcA, {});
      await manageTag();
    } catch (ex) {
      console.warn('Oops!', ex);
    } finally {
      await NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
    }

    await new Promise(resolve => setTimeout(resolve, 250)); // chance for UI to propagate
  }
}

function SelfTest() {
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [isReading, setIsReading] = useState<boolean>(true);

  async function getStatus() {
    setStatus(await sdk.getStatus());
  }

  useEffect(() => {
    NfcManager.isSupported().then(value => {
      if (value) {
        console.log('NFC read starting...');
        NfcManager.start().then(listenForTags);
      } else {
        throw new Error('NFC not supported');
      }
    });
  }, []);

  return (
    <View style={styles.wrapper}>
      <Button onPress={() => getStatus()} title="getStatus" />

      {isReading ? (
        <Button
          title="stop reading NFC device"
          onPress={() => {
            keepReading = false;
            setIsReading(false);
            NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
          }}
        />
      ) : (
        <Button
          title="start reading NFC device"
          onPress={() => {
            setIsReading(true);
            keepReading = true;
            listenForTags();
          }}
        />
      )}

      <Button
        title="unlock portal"
        onPress={() => {
          sdk.unlock('1');
        }}
      />

      <Button
        title="publicDescriptors"
        onPress={() => {
          sdk.publicDescriptors().then(d => {
            alert(JSON.stringify(d.external, null, 2));
          });
        }}
      />

      <Text>{JSON.stringify(status)}</Text>
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

export default SelfTest;
