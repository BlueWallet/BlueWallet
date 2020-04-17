import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { typography, palette } from 'app/styles';

import { GradientVariant, GradientView } from './GradientView';

interface Props {
  title: string;
  variant?: GradientVariant;
}

export const Avatar = (props: Props) => {
  return (
    <GradientView variant={props.variant || GradientVariant.Primary} style={styles.container}>
      <Text style={styles.title}>{props.title}</Text>
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: { width: 33, height: 33, borderRadius: 20, justifyContent: 'center' },
  title: { ...typography.headline6, color: palette.white, textAlign: 'center' },
});
