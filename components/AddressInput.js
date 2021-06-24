import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native-elements';
import { findNodeHandle, Image, Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { getSystemName } from 'react-native-device-info';
import { useTheme } from '@react-navigation/native';

import loc from '../loc';
import * as NavigationService from '../NavigationService';
const fs = require('../blue_modules/fs');

const isDesktop = getSystemName() === 'Mac OS X';

const AddressInput = ({
  isLoading = false,
  address = '',
  placeholder = loc.send.details_address,
  onChangeText,
  onBarScanned,
  launchedBy,
}) => {
  const { colors } = useTheme();
  const scanButtonRef = useRef();

  const stylesHook = StyleSheet.create({
    root: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    scan: {
      backgroundColor: colors.scanLabel,
    },
    scanText: {
      color: colors.inverseForegroundColor,
    },
  });

  return (
    <View style={[styles.root, stylesHook.root]}>
      <TextInput
        testID="AddressInput"
        onChangeText={onChangeText}
        placeholder={placeholder}
        numberOfLines={1}
        placeholderTextColor="#81868e"
        value={address}
        style={styles.input}
        editable={!isLoading}
        onSubmitEditing={Keyboard.dismiss}
      />
      <TouchableOpacity
        testID="BlueAddressInputScanQrButton"
        disabled={isLoading}
        onPress={() => {
          Keyboard.dismiss();
          if (isDesktop) {
            fs.showActionSheet({ anchor: findNodeHandle(scanButtonRef.current) }).then(onBarScanned);
          } else {
            NavigationService.navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy,
                onBarScanned,
              },
            });
          }
        }}
        accessibilityRole="button"
        style={[styles.scan, stylesHook.scan]}
        accessibilityLabel={loc.send.details_scan}
        accessibilityHint={loc.send.details_scan_hint}
      >
        <Image source={require('../img/scan-white.png')} accessible={false} />
        <Text style={[styles.scanText, stylesHook.scanText]} accessible={false}>
          {loc.send.details_scan}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
  scan: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanText: {
    marginLeft: 4,
  },
});

AddressInput.propTypes = {
  isLoading: PropTypes.bool,
  onChangeText: PropTypes.func,
  onBarScanned: PropTypes.func.isRequired,
  launchedBy: PropTypes.string,
  address: PropTypes.string,
  placeholder: PropTypes.string,
};

export default AddressInput;
