import React, { useState, useContext } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput, Keyboard } from 'react-native';

import loc from '../../loc';
import { BlueButton, BlueButtonLink, BlueCard, BlueSpacing10, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isMacCatalina } from '../../blue_modules/environment';
const fs = require('../../blue_modules/fs');

const IsItMyAddress = () => {
  /** @type {AbstractWallet[]} */
  const wallets = useContext(BlueStorageContext).wallets;
  const { navigate } = useNavigation();
  const { name } = useRoute();
  const { colors } = useTheme();

  const [address, setAddress] = useState('');
  const [result, setResult] = useState('');

  const stylesHooks = StyleSheet.create({
    blueArea: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.foregroundColor,
    },
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
        _result.push(loc.formatString(loc.is_it_my_address.owns, { label: w.getLabel(), address: cleanAddress }));
      }
    }

    if (_result.length === 0) {
      setResult(_result.push(loc.is_it_my_address.no_wallet_owns_address));
    }

    setResult(_result.join('\n\n'));
  };

  const onBarScanned = value => {
    setAddress(value);
  };

  const importScan = () => {
    if (isMacCatalina) {
      fs.showActionSheet().then(onBarScanned);
    } else {
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: name,
          onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  const clearAddressInput = () => {
    setAddress('');
    setResult();
  };

  return (
    <SafeBlueArea style={[styles.blueArea, stylesHooks.blueArea]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null} keyboardShouldPersistTaps="handled">
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
              />
            </View>

            <BlueSpacing10 />
            <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
            <BlueSpacing10 />
            <BlueButton title={loc.send.input_clear} onPress={clearAddressInput} />
            <BlueSpacing20 />
            <BlueButton disabled={address.trim().length === 0} title={loc.is_it_my_address.check_address} onPress={checkAddress} />
            <BlueSpacing20 />
            <BlueText>{result}</BlueText>
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
