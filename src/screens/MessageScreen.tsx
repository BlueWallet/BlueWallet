import React from 'react';
import { Image, FastImageSource } from 'components/Image';
import { ButtonProps } from 'react-native-elements';
import { Text, View, StyleSheet } from 'react-native';
import { useNavigationParam } from 'react-navigation-hooks';
import { Button } from 'components/Button';

import { typography, palette } from 'styles';

export const MessageScreen = () => {
  const title: string = useNavigationParam('title');
  const source: FastImageSource = useNavigationParam('source');
  const description: string = useNavigationParam('description');
  const button: ButtonProps | undefined = useNavigationParam('button');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Image source={source} style={styles.image} resizeMode="contain" />
      <Text style={styles.description}>{description}</Text>
      {button && <Button {...button} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  title: { ...typography.headline4 },
  image: {
    height: 172,
    width: '100%',
    marginTop: 40,
    marginBottom: 40,
  },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 97,
  },
});
