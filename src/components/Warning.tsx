import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

export const Warning = () => {
  return (
    <View style={styles.container}>
      <Text>
        <Text style={typography.warningBold}>{i18n.send.warning}</Text>
        <Text style={typography.warning}>{i18n.send.warningGeneral}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: palette.lightRed, borderRadius: 6, padding: 13 },
});
