import React, { ReactElement } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { GradientView } from './GradientView';
import { getStatusBarHeight, palette, typography } from 'styles';

interface Props {
  title: string;
  leftItem?: ReactElement;
  onLeftItemPress?: () => void;
}

export const Header = ({ title, leftItem, onLeftItemPress }: Props) => (
  <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
    <>
      {leftItem && (
        <TouchableOpacity style={styles.leftItemContainer} onPress={onLeftItemPress}>
          {leftItem}
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </>
  </GradientView>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: getStatusBarHeight() + 11,
    paddingBottom: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    ...typography.headline4,
    color: palette.white,
  },
  leftItemContainer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
  },
});
