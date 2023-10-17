import React, { useState, useContext, useRef } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput, Keyboard } from 'react-native';

import loc from '../../loc';
import { BlueButton, BlueButtonLink, BlueCard, BlueSpacing10, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { requestCameraAuthorization } from '../../helpers/scan-qr';

const IsItMyAddress = () => {
  /** @type {AbstractWallet[]} */
  const wallets = useContext(BlueStorageContext).wallets;
  const { navigate } = useNavigation();
  const { name } = useRoute();
  const { colors } = useTheme();
  const scanButtonRef = useRef();

  const [address, setAddress] = useState('');
  const [result, setResult] = useState('');
  const [resultCleanAddress, setResultCleanAddress] = useState();

  const stylesHooks = StyleSheet.create({
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const handleUpdateAddress = nextValue => setAddress(nextValue.trim());

  const checkAddress = () => {
    Keyboard.dismiss();
    const cleanAddress = address.replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
    const _result = [];
    for (const w of wallets) {
      if (w.weOwnAddress(cleanAddress)) {
        setResultCleanAddress(cleanAddress);
        _result.push(loc.formatString(loc.is_it_my_address.owns, { label: w.getLabel(), address: cleanAddress }));
      }
    }

    if (_result.length === 0) {
      setResult(_result.push(loc.is_it_my_address.no_wallet_owns_address));
      setResultCleanAddress();
    }

    setResult(_result.join('\n\n'));
  };

  const onBarScanned = value => {
    setAddress(value);
    setResultCleanAddress(value);
  };

  const importScan = () => {
    requestCameraAuthorization().then(() => {
    navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: name,
        onBarScanned,
        showFileImportButton: true,
      },
    });
  });

  const clearAddressInput = () => {
    setAddress('');
    setResult();
    setResultCleanAddress();
  };

  const viewQRCode = () => {
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        address: resultCleanAddress,
      },
    });
  };

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView
        enabled={!Platform.isPad}
        behavior={Platform.OS === 'ios' ? 'position' : null}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          <BlueCard style={styles.mainCard}>
            <View style={[styles.input, stylesHooks.input]}>
              <TextInput
                style={styles.text}
                maxHeight={100}
                minHeight={100}
                maxWidth="100%"
                minWidth="100%"
                multiline
                editable
                placeholder={loc.is_it_my_address.enter_address}
                placeholderTextColor="#81868e"
                value={address}
                onChangeText={handleUpdateAddress}
                testID="AddressInput"
              />
            </View>

            <BlueSpacing10 />
            <BlueButtonLink ref={scanButtonRef} title={loc.wallets.import_scan_qr} onPress={importScan} />
            <BlueSpacing10 />
            <BlueButton title={loc.send.input_clear} onPress={clearAddressInput} />
            <BlueSpacing20 />
            {resultCleanAddress && (
              <>
                <BlueButton title={loc.is_it_my_address.view_qrcode} onPress={viewQRCode} />
                <BlueSpacing20 />
              </>
            )}
            <BlueButton
              disabled={address.trim().length === 0}
              title={loc.is_it_my_address.check_address}
              onPress={checkAddress}
              testID="CheckAddress"
            />
            <BlueSpacing20 />
            <BlueText testID="Result">{result}</BlueText>
          </BlueCard>
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
};

export default IsItMyAddress;
IsItMyAddress.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.is_it_my_address.title }));

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  blueArea: {
    paddingTop: 19,
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    alignItems: 'center',
    borderRadius: 4,
  },
  text: {
    padding: 8,
    minHeight: 33,
    color: '#81868e',
  },
});
