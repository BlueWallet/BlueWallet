import { useState, useEffect, useCallback } from 'react';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export const useNFC = () => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [tagData, setTagData] = useState<any>(null);

  useEffect(() => {
    const startNfc = async () => {
      try {
        await NfcManager.start();
        const isSupported = await NfcManager.isSupported();
        setSupported(isSupported);

        const isEnabled = await NfcManager.isEnabled();
        setEnabled(isEnabled);
      } catch (error: any) {
        console.warn(error.message);
      }
    };

    startNfc();

    // return () => {
    //   NfcManager.setEventListener(NfcTech.Ndef, null);
    // };
  }, []);

  const startReading = useCallback(async () => {
    console.log('starting NFC scan...');
    setIsScanning(true);
    setTagData(null);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      setTagData(tag);
      console.log('NFC read:', JSON.stringify(tag));
    } catch (error: any) {
      console.warn(error.message);
    } finally {
      NfcManager.cancelTechnologyRequest();
      setIsScanning(false);
    }
  }, []);

  const stopReading = useCallback(async () => {
    console.log('stopped NFC scan');
    NfcManager.cancelTechnologyRequest();
    setIsScanning(false);
  }, []);

  /* const writeTag = useCallback(async (message: string) => {
    setIsScanning(true);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = NfcManager.bytesToNdef([NfcManager.textRecord(message)]);
      await NfcManager.writeNdefMessage(bytes);
      alert('Tag written successfully!');
    } catch (error) {
      console.warn(error);
    } finally {
      await NfcManager.cancelTechnologyRequest();
      setIsScanning(false);
    }
  }, []); */

  return {
    supported,
    enabled,
    isScanning,
    tagData,
    startReading,
    stopReading,
    // writeTag,
  };
};
