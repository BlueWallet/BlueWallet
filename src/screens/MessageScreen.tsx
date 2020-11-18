import { RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Text, View, StyleSheet, BackHandler, StatusBar } from 'react-native';

import { Button, Image } from 'app/components';
import { Route, RootStackParams } from 'app/consts';
import { typography, palette, ifIphoneX } from 'app/styles';

interface Props {
  route: RouteProp<RootStackParams, Route.Message>;
}

export const MessageScreen = (props: Props) => {
  const { title, source, description, buttonProps, imageStyle, asyncTask } = props.route.params;

  useEffect(() => {
    const onBackPress = () => true;
    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    if (asyncTask) {
      const asynchrousTask = async () => {
        await asyncTask();
      };
      // hack for creating message screen immediately
      setTimeout(() => asynchrousTask(), 0);
    }

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [asyncTask]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>{title}</Text>
      <Image source={source} style={[styles.image, imageStyle]} resizeMode="contain" />
      <Text style={styles.description}>{description}</Text>
      {buttonProps && <Button testID="close-button" {...buttonProps} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: ifIphoneX(54, 20),
    backgroundColor: palette.white,
  },
  title: { ...typography.headline4, marginTop: '30%', textAlign: 'center' },
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
