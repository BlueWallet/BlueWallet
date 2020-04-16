import React from 'react';
import { StyleSheet } from 'react-native';
// @ts-ignore
import { BottomTabBar } from 'react-navigation-tabs';

import { palette } from 'app/styles';

import { GradientView } from './GradientView';

export const BottomTabBarComponent = (props: any) => {
  return (
    <GradientView variant={GradientView.Variant.Primary}>
      <BottomTabBar {...props} style={styles.tabBar} />
    </GradientView>
  );
};

const styles = StyleSheet.create({
  tabBar: { backgroundColor: palette.transparent },
});
