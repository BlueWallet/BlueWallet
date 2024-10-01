import React, { useRef } from 'react';
import { Platform, TouchableOpacity, StyleSheet, Text } from 'react-native';
import BottomModal, { BottomModalHandle } from './BottomModal';
import { useNFC } from '../hooks/useNFC';
import Button from './Button.tsx';

const NFCModal = () => {
  const { isScanning, tagData, startReading, stopReading } = useNFC();
  const bottomModalRef = useRef<BottomModalHandle>(null);

  const onReadNfcPress = async () => {
    if (bottomModalRef.current) {
      await bottomModalRef.current.present();
    }
    startReading();
  };

  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pick NFC signal"
          style={styles.filePickerTouch}
          onPress={onReadNfcPress}
        >
          <Text style={styles.nfcIcon}>NFC</Text>
        </TouchableOpacity>

        <BottomModal
          sizes={['auto', 'large']}
          ref={bottomModalRef}
          onClose={() => stopReading()}
          contentContainerStyle={styles.modalContentShort}
        >
          {!tagData ? (
            <Text style={styles.tagText}>Scanning for NFC tags...</Text>
          ) : (
            tagData && <Text style={styles.tagText}>Tag Data: {JSON.stringify(tagData)}</Text>
          )}

          {isScanning ? (
            <Button
              title="Stop Scanning"
              onPress={() => {
                stopReading();
                bottomModalRef.current?.dismiss();
              }}
            />
          ) : (
            <Button
              title="Start Scanning"
              onPress={() => {
                startReading();
              }}
            />
          )}
        </BottomModal>
      </>
    );
  }

  // ios:
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Pick NFC signal"
      style={styles.button}
      onPress={() => {
        startReading().catch(err => console.error(err.message));
      }}
    >
      <Text style={styles.nfcIcon}>NFC</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filePickerTouch: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    right: 48,
    bottom: 48,
  },
  button: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  nfcIcon: { color: 'white', left: 6, fontWeight: 'bold' },
  modalContentShort: {
    padding: 44,
  },
  tagText: {
    paddingBottom: 20,
  },
});

export default NFCModal;
