import React, { useState } from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { PortalSdk, type NfcOut, type CardStatus } from 'libportal-react-native';

const sdk = new PortalSdk(true);

function livenessCheck(): Promise<NfcOut> {
  return new Promise((_resolve, reject) => {
    const interval = setInterval(() => {
      NfcManager.getTag()
        .then(() => NfcManager.transceive([0x30, 0xED]))
        .catch(() => {
          NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
          clearInterval(interval);

          reject("Removed tag");
        }); 
    }, 250);
  });
}

async function manageTag() {
  await sdk.newTag();
  const check = livenessCheck();

  while (true) {
    const msg = await Promise.race([sdk.poll(), check]);
    // console.trace('>', msg.data);
    const result = await NfcManager.nfcAHandler.transceive(msg.data);
    // console.trace('<', result);
    await sdk.incomingData(msg.msgIndex, result);
  }
}

async function listenForTags() {
  while (true) {
    console.info('Looking for a Portal...');

    try {
      await NfcManager.registerTagEvent();
      await NfcManager.requestTechnology(NfcTech.NfcA, {});
      await manageTag();
    } catch (ex) {
      console.warn('Oops!', ex);
    } finally {
      NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 });
    }
  }
}

NfcManager.isSupported()
  .then((value) => {
    if (value) {
      NfcManager.start();
      return listenForTags();
    } else {
      throw "NFC not supported";
    }
  });

function App() {
  const [status, setStatus] = useState<CardStatus | null>(null);
  async function getStatus() {
    setStatus(await sdk.getStatus())
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={getStatus}>
        <Text>getStatus()</Text>
      </TouchableOpacity>

      <Text>{ JSON.stringify(status) }</Text>
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

export default App;