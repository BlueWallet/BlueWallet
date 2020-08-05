import React from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle } from 'react-native';

import { palette } from 'app/styles';

export const Separator = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[styles.seprator, style]} />;

const styles = StyleSheet.create({
  seprator: {
    width: Dimensions.get('window').width,
    alignSelf: 'center',
    marginVertical: 20,
    borderTopWidth: 1,
    borderColor: palette.lightGrey,
  },
});
