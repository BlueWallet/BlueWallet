import React from 'react';
import { BottomTabBar } from 'react-navigation-tabs';
import { StyleSheet } from 'react-native';

import { palette } from 'styles';

export const BottomTabBarComponent = (props: any) => {
  // add gradient here
  return <BottomTabBar {...props} style={styles.container} />;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.textGrey,
  },
});
