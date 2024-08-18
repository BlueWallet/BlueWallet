import React, { useRef } from 'react';
import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';
import BottomModal, { BottomModalHandle } from './BottomModal';
import { useNFC } from '../hooks/useNFC';

// Internal component for Android-specific NFC logic and UI as iOS uses native NFC UI
const NFCModalAndroid = () => {
  const { isScanning, tagData, readTag } = useNFC();

  const bottomModalRef = useRef<BottomModalHandle>(null);

  const handlePress = async () => {
    if (bottomModalRef.current) {
      await bottomModalRef.current.present();
    }
    readTag();
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Pick NFC signal"
        style={styles.filePickerTouch}
        onPress={handlePress}
      >
        <Icon name="nfc-signal" type="font-awesome-5" color="#ffffff" />
      </TouchableOpacity>

      <BottomModal ref={bottomModalRef} onClose={() => {}}>
        {isScanning ? <Text>Scanning for NFC tags...</Text> : tagData && <Text>Tag Data: {JSON.stringify(tagData)}</Text>}
        <Button title="Stop Scanning" onPress={() => bottomModalRef.current?.dismiss()} />
      </BottomModal>
    </>
  );
};

const NFCModal = () => {
  if (Platform.OS === 'android') {
    return <NFCModalAndroid />;
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Pick NFC signal"
      style={styles.button}
      onPress={() => {
        useNFC().readTag();
      }}
    >
      <Icon name="nfc-signal" type="font-awesome-5" color="#ffffff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});


export default NFCModal;
