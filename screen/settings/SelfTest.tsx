import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type CardStatus } from 'libportal';
import Button from '../../components/Button.tsx';
import * as PortalDevice from '../../blue_modules/portal-device.ts';

function SelfTest() {
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [, setRedraw] = useState<number>(0);

  async function getStatus() {
    setStatus(await PortalDevice.getStatus());
  }

  useEffect(() => {
    PortalDevice.init()?.then(() => setRedraw(Math.random()));
  }, []);

  return (
    <View style={styles.wrapper}>
      <Button onPress={() => getStatus()} title="getStatus" />

      {PortalDevice.isReading() ? (
        <Button
          title="stop reading NFC device"
          onPress={async () => {
            PortalDevice.stopReading();
            setRedraw(Math.random());
          }}
        />
      ) : (
        <Button
          title="start reading NFC device"
          onPress={async () => {
            PortalDevice.startReading();
            setRedraw(Math.random());
          }}
        />
      )}

      <Button
        title="unlock portal"
        onPress={() => {
          PortalDevice.unlock('1');
        }}
      />

      <Button
        title="publicDescriptors"
        onPress={() => {
          PortalDevice.publicDescriptors().then(d => {
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
