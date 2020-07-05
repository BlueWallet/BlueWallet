import React, { useEffect, useState } from 'react';
import { ScrollView, Linking, Dimensions, Image, View, Text, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import {
  BlueTextCentered,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueListItemHooks,
  BlueNavigationStyle,
  BlueLoadingHook,
} from '../../BlueComponents';
import { getApplicationName, getVersion, getBundleId, getBuildNumber } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
/** @type {AppStorage} */
const { width, height } = Dimensions.get('window');
const loc = require('../../loc/');

const About = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 54,
    },
    logo: {
      width: 102,
      height: 124,
    },
    textFree: {
      maxWidth: 260,
      marginVertical: 24,
      color: '#9AA0AA',
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
    },
    textBackup: {
      maxWidth: 260,
      marginBottom: 40,
      color: colors.foregroundColor,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
    },
    buildWith: {
      backgroundColor: colors.inputBackgroundColor,
      padding: 16,
      paddingTop: 0,
      borderRadius: 8,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleOnReleaseNotesPress = () => {
    navigate('ReleaseNotes');
  };

  const handleOnSelfTestPress = () => {
    navigate('Selftest');
  };

  const handleOnLicensingPress = () => {
    navigate('Licensing');
  };

  const handleOnTwitterPress = () => {
    Linking.openURL('https://twitter.com/bluewalletio');
  };

  const handleOnGithubPress = () => {
    Linking.openURL('https://github.com/BlueWallet/BlueWallet');
  };

  const handleOnTelegramPress = () => {
    Linking.openURL('https://t.me/bluewallet');
  };

  const handleOnRatePress = () => {
    const options = {
      AppleAppID: '1376878040',
      GooglePackageName: 'io.bluewallet.bluewallet',
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: true,
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: 'https://bluewallet.io',
    };
    Rate.rate(options, success => {
      if (success) {
        console.log('User Rated.');
      }
    });
  };

  return isLoading ? (
    <BlueLoadingHook />
  ) : (
    <SafeBlueArea style={styles.root}>
      <ScrollView testID="AboutScrollView">
        <BlueCard>
          <View style={styles.center}>
            <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
            <Text style={styles.textFree}>BlueWallet is a free and open source project. Crafted by Bitcoin users.</Text>
            <Text style={styles.textBackup}>Always backup your keys!</Text>
            <BlueButton onPress={handleOnRatePress} title="Leave us a review ⭐🙏" />
          </View>
        </BlueCard>
        <BlueListItemHooks
          leftIcon={{
            name: 'twitter',
            type: 'font-awesome',
            color: '#1da1f2',
          }}
          onPress={handleOnTwitterPress}
          title="Follow us on Twitter"
        />
        <BlueListItemHooks
          leftIcon={{
            name: 'telegram',
            type: 'font-awesome',
            color: '#0088cc',
          }}
          onPress={handleOnTelegramPress}
          title="Telegram chat"
        />
        <BlueListItemHooks
          leftIcon={{
            name: 'github',
            type: 'font-awesome',
            color: colors.foregroundColor,
          }}
          onPress={handleOnGithubPress}
          title="GitHub"
        />
        <BlueCard>
          <View style={styles.buildWith}>
            <BlueSpacing20 />

            <BlueTextCentered>Built with the awesome 👍</BlueTextCentered>
            <BlueSpacing20 />
            <BlueTextCentered>React Native</BlueTextCentered>
            <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
            <BlueTextCentered>Nodejs</BlueTextCentered>
            <BlueTextCentered>Electrum server</BlueTextCentered>
          </View>
        </BlueCard>
        <BlueListItemHooks
          leftIcon={{
            name: 'book',
            type: 'font-awesome',
            color: '#9AA0AA',
          }}
          chevron
          onPress={handleOnReleaseNotesPress}
          title="Release notes"
        />
        <BlueListItemHooks
          leftIcon={{
            name: 'law',
            type: 'octicon',
            color: colors.foregroundColor,
          }}
          chevron
          onPress={handleOnLicensingPress}
          title="MIT License"
        />
        <BlueListItemHooks
          leftIcon={{
            name: 'flask',
            type: 'font-awesome',
            color: '#FC0D44',
          }}
          chevron
          onPress={handleOnSelfTestPress}
          title="Run self test"
          testID="RunSelfTestButton"
        />
        <BlueSpacing20 />
        <BlueSpacing20 />
        <BlueTextCentered>
          {getApplicationName()} ver {getVersion()} (build {getBuildNumber()})
        </BlueTextCentered>
        <BlueTextCentered>{new Date(getBuildNumber() * 1000).toGMTString()}</BlueTextCentered>
        <BlueTextCentered>{getBundleId()}</BlueTextCentered>
        <BlueTextCentered>
          w, h = {width}, {height}
        </BlueTextCentered>
        <BlueSpacing20 />
        <BlueSpacing20 />
      </ScrollView>
    </SafeBlueArea>
  );
};

About.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  headerTitle: loc.settings.about,
});
export default About;
