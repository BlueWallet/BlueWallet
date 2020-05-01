import React from 'react';
import { Text, StyleSheet, View, Linking, Dimensions } from 'react-native';
import { getApplicationName, getVersion, getBundleId, getBuildNumber } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
import { NavigationScreenProps } from 'react-navigation';

import { icons } from 'app/assets';
import { ScreenTemplate, Button, Header } from 'app/components';
import { Route } from 'app/consts';
import i18n from 'app/locale';
import { typography, palette } from 'app/styles';

export const AboutUsScreen = (props: NavigationScreenProps) => {
  const libraries = [
    'React Native',
    'React Native Elements',
    'React Redux',
    'Bitcoinjs-lib',
    'Typescript',
    'bignumber.js',
    'blockcypher.com API',
    'React Native Linear Gradient',
  ];

  const getBuildData = () => {
    const { width, height } = Dimensions.get('window');
    return `${getApplicationName()} ver. ${getVersion()} (build ${getBuildNumber()}) \n ${getBundleId()} \n w, h = ${width.toFixed(
      0,
    )}, ${height.toFixed(0)}`;
  };

  const handleRateButtonPress = () => {
    const options = {
      AppleAppID: '1376878040',
      GooglePackageName: 'io.goldwallet.wallet',
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: true,
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: 'https://bitcoinvault.global',
    };
    Rate.rate(options, success => {
      if (success) {
        console.log('User Rated.');
      }
    });
  };

  const navigateToReleaseNotes = () => props.navigation.navigate(Route.ReleaseNotes);

  const goToGithub = () => {
    Linking.openURL('https://github.com/bitcoinvault/GoldWallet');
  };

  return (
    <ScreenTemplate>
      <Text style={styles.title}>{i18n.aboutUs.title}</Text>
      <Text style={styles.description}>{i18n.aboutUs.alwaysBackupYourKeys}</Text>
      <Button
        source={icons.github}
        onPress={goToGithub}
        title={i18n.aboutUs.goToOurGithub}
        containerStyle={styles.buttonContainer}
      />
      <Button
        onPress={handleRateButtonPress}
        source={icons.star}
        title={i18n.aboutUs.rateGoldWallet}
        containerStyle={styles.buttonContainer}
      />
      <View style={styles.buildWithContainer}>
        <Text style={styles.title}>{i18n.aboutUs.buildWithAwesome}</Text>
        {libraries.map((item, key) => (
          <Text key={key} style={styles.description}>
            {item}
          </Text>
        ))}
      </View>
      <Button
        onPress={navigateToReleaseNotes}
        title={i18n.aboutUs.releaseNotes}
        containerStyle={styles.buttonContainer}
      />
      {/**
       * Run self test is currently hidden, because it was returning error and the file
       * was deleted in that PR:
       * https://github.com/bitcoinvault/GoldWallet/pull/68
       * error: https://files.slack.com/files-pri/T0115UMHJP9-F013J1UGAG0/image.png
       * <Button title={i18n.aboutUs.runSelfTest} containerStyle={styles.buttonContainer} />
       */}
      <Text style={styles.buildData}>{getBuildData()}</Text>
    </ScreenTemplate>
  );
};

AboutUsScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header isBackArrow={true} navigation={props.navigation} title={i18n.aboutUs.header} />,
});

const styles = StyleSheet.create({
  buttonContainer: {
    paddingTop: 20,
  },
  title: {
    ...typography.headline4,
    textAlign: 'center',
    paddingBottom: 14,
  },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  buildData: {
    ...typography.subtitle4,
    color: palette.textGrey,
    textAlign: 'center',
    paddingVertical: 20,
  },
  buildWithContainer: {
    paddingTop: 36,
  },
});
