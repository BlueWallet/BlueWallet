import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { ScreenTemplate, Image, Button } from 'app/components';
import { logoSource } from 'app/helpers/images';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  onButtonPress: () => void;
}

export const BetaVersionScreen = ({ onButtonPress }: Props) => (
  <ScreenTemplate footer={<Button onPress={onButtonPress} title={i18n.betaVersion.button} />}>
    <Image source={logoSource} style={styles.logo} resizeMode="contain" />
    <Text style={styles.title}>{i18n.betaVersion.title}</Text>
    <Text style={styles.description}>{i18n.betaVersion.description}</Text>
  </ScreenTemplate>
);

const styles = StyleSheet.create({
  logo: {
    height: 166,
    marginTop: 73,
    width: '100%',
  },
  title: { ...typography.headline4, textAlign: 'center', paddingTop: 33, paddingBottom: 16 },
  description: {
    ...typography.body,
    textAlign: 'center',
    color: palette.textGrey,
    paddingHorizontal: 17,
  },
});
