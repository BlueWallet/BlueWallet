import React, { useState, useContext } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import loc from '../../loc';
import {
  SafeBlueArea,
  BlueCard,
  BlueButton,
  BlueSpacing10,
  BlueSpacing20,
  BlueFormLabel,
  BlueNavigationStyle,
  BlueText,
  BlueButtonLink,
} from '../../BlueComponents';
import { BlueCurrentTheme } from '../../components/themes';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const IsItMyAddress = () => {
  /** @type {AbstractWallet[]} */
  const wallets = useContext(BlueStorageContext).wallets;
  const navigation = useNavigation();
  const route = useRoute();

  const [address, setAddress] = useState('');
  const [result, setResult] = useState('');

  const handleUpdateAddress = nextValue => setAddress(nextValue.trim());

  const checkAddress = async () => {
    const cleanAddress = address.replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
    const _result = [];
    for (const w of wallets) {
      if (w.weOwnAddress(cleanAddress)) {
        _result.push(loc.formatString(loc.is_it_my_address.owns, { label: w.getLabel(), address: cleanAddress }));
      }
    }

    setResult(_result.join('\n\n'));
  };

  const onBarScanned = async value => {
    setAddress(value);
  };

  const importScan = async () => {
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: route.name,
        onBarScanned: onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <BlueCard style={styles.mainCard}>
            <View style={styles.topFormRow}>
              <BlueFormLabel>{loc.is_it_my_address.enter_address}</BlueFormLabel>
            </View>
            <TextInput
              style={styles.text}
              maxHeight={100}
              minHeight={100}
              maxWidth="100%"
              minWidth="100%"
              multiline
              editable
              value={address}
              onChangeText={handleUpdateAddress}
            />

            <BlueSpacing10 />
            <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
            <BlueSpacing10 />
            <BlueButton title={loc.is_it_my_address.check_address} onPress={checkAddress} />
            <BlueSpacing20 />
            <BlueText>{result}</BlueText>
          </BlueCard>
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
};

export default IsItMyAddress;
IsItMyAddress.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.is_it_my_address.title,
});

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  blueArea: {
    flex: 1,
    paddingTop: 19,
  },
  broadcastResultWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  link: {
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topFormRow: {
    flex: 0.1,
    flexBasis: 0.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 0,
    paddingRight: 100,
    height: 30,
    maxHeight: 30,
  },
  text: {
    flex: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#d2f8d6',
    borderRadius: 4,
    marginTop: 20,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
});
