import React, { useEffect } from 'react';
import { Text, View, StyleSheet, StyleProp, ViewStyle, BackHandler } from 'react-native';
import { ButtonProps } from 'react-native-elements';
import { useNavigationParam } from 'react-navigation-hooks';

import { Button, Image, FastImageSource } from 'app/components';
import { typography, palette, ifIphoneX } from 'app/styles';

export interface MessageProps {
  title: string;
  source: FastImageSource;
  description: string;
  buttonProps?: ButtonProps;
  imageStyle?: StyleProp<ViewStyle>;
  asyncTask?: () => void;
}

export const MessageScreen = () => {
  const title: string = useNavigationParam('title');
  const source: FastImageSource = useNavigationParam('source');
  const description: string = useNavigationParam('description');
  const buttonProps: ButtonProps = useNavigationParam('buttonProps');
  const imageStyle: StyleProp<ViewStyle> = useNavigationParam('imageStyle');
  const asyncTask = useNavigationParam('asyncTask');

  useEffect(() => {
    const onBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    if (asyncTask) {
      const asynchrousTask = async () => {
        await asyncTask();
      };

      asynchrousTask();
    }

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [asyncTask]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Image source={source} style={[styles.image, imageStyle]} resizeMode="contain" />
      <Text style={styles.description}>{description}</Text>
      {buttonProps && <Button {...buttonProps} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: ifIphoneX(54, 20),
  },
  title: { ...typography.headline4, marginTop: '30%' },
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
    flexGrow: 1,
  },
});
