import dayjs from 'dayjs';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, BackHandler } from 'react-native';

import { Button, ScreenTemplate, FlatButton } from 'app/components';
import { TimeCounter } from 'app/components/TimeCounter';
import { useInterval } from 'app/helpers/useInterval';
import { AppStateManager } from 'app/services';
import { typography } from 'app/styles';
import { isIos } from 'app/styles/helpers';

const i18n = require('../../loc');

interface Props {
  timestamp: number;
  onTryAgain: Function;
}

export const TimeCounterScreen = (props: Props) => {
  const { timestamp: propTimestamp, onTryAgain: propOnTryAgain } = props;

  const timestamp = propTimestamp;
  const onTryAgain = propOnTryAgain;
  const getLeftSeconds = () => {
    const currentTimestamp = dayjs().unix();
    return timestamp > currentTimestamp ? parseInt((timestamp - currentTimestamp).toFixed(0)) : 0;
  };
  const [seconds, setSeconds] = useState(getLeftSeconds());

  useInterval(
    () => {
      setSeconds(seconds - 1);
    },
    seconds > 0 ? 1000 : null,
  );

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', exitApp);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', exitApp);
    };
  });

  const exitApp = () => {
    BackHandler.exitApp();
    return true;
  };

  const onTryAgainPress = () => {
    onTryAgain();
  };

  const setCurrentLeftSeconds = () => {
    setSeconds(getLeftSeconds());
  };

  return (
    <ScreenTemplate
      footer={
        <>
          <Button disabled={seconds !== 0} onPress={onTryAgainPress} title={i18n.timeCounter.tryAgain} />
          {!isIos() && (
            <FlatButton containerStyle={styles.flatButton} onPress={exitApp} title={i18n.timeCounter.closeTheApp} />
          )}
        </>
      }
    >
      <AppStateManager handleAppComesToForeground={setCurrentLeftSeconds} />
      <View style={styles.descriptionContainer}>
        <Text style={styles.title}>{i18n.timeCounter.title}</Text>
        <Text style={styles.description}>{i18n.timeCounter.description}</Text>
      </View>
      <View style={styles.timerContainer}>
        <TimeCounter value={seconds} />
      </View>
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  descriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  flatButton: {
    marginTop: 20,
  },
  title: {
    marginTop: 110,
    marginBottom: 18,
    ...typography.headline4,
  },
  description: {
    ...typography.caption,
    color: '#949595',
    textAlign: 'center',
  },
});
