import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import BlueText from './BlueText';
import { BlueCurrentTheme } from './themes';
import loc from '../loc';

const TxHex: React.FC<{ hex: string }> = ({ hex }) => (
  <View style={styles.root}>
    <BlueText style={styles.label}>{loc.send.create_this_is_hex}</BlueText>
    <ScrollView style={styles.box} contentContainerStyle={styles.boxContent}>
      <Text selectable style={styles.hex}>
        {hex}
      </Text>
    </ScrollView>

    <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => Clipboard.setString(hex)}>
      <Text style={styles.actionText}>{loc.send.create_copy}</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => Linking.openURL('https://coinb.in/?verify=' + hex)}>
      <Text style={styles.actionText}>{loc.send.create_verify}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
  },
  label: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontWeight: '500',
    textAlign: 'center',
  },
  box: {
    flex: 1,
    minHeight: 112,
    borderColor: '#ebebeb',
    backgroundColor: '#d2f8d6',
    borderRadius: 4,
    marginTop: 20,
  },
  boxContent: {
    padding: 16,
  },
  hex: {
    color: '#37c0a1',
    fontWeight: '500',
    fontSize: 14,
  },
  action: {
    marginVertical: 24,
  },
  actionText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
});

export default TxHex;
