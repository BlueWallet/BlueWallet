import React, { useEffect, useState } from 'react';
import { ScrollView, Linking, Dimensions, Image, View, Text } from 'react-native';
import { useNavigation } from 'react-navigation-hooks';
import {
  BlueTextCentered,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueListItem,
} from '../../BlueComponents';
import { getApplicationName, getVersion, getBundleId, getBuildNumber } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
/** @type {AppStorage} */
const { width, height } = Dimensions.get('window');
const loc = require('../../loc/');

const About = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();

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
    <BlueLoading />
  ) : (
    <SafeBlueArea style={{ flex: 1 }}>
      <ScrollView testID="AboutScrollView">
        <BlueCard>
          <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 54 }}>
            <Image
              source={require('../../img/bluebeast.png')}
              style={{
                width: 102,
                height: 124,
              }}
            />
            <Text style={{ maxWidth: 260, marginVertical: 24, color: '#9AA0AA', fontSize: 15, textAlign: 'center', fontWeight: '500' }}>
              BlueWallet is a free and open source project. Crafted by Bitcoin users.
            </Text>
            <Text style={{ maxWidth: 260, marginBottom: 40, color: '#0C2550', fontSize: 15, textAlign: 'center', fontWeight: '500' }}>
              Always backup your keys!
            </Text>
            <BlueButton onPress={handleOnRatePress} title="help with a review ⭐🙏" />
          </View>
        </BlueCard>
        <BlueListItem
          leftIcon={{
            name: 'twitter',
            type: 'font-awesome',
            color: '#1da1f2',
          }}
          onPress={handleOnTwitterPress}
          title="Follow us on Twitter"
        />
        <BlueListItem
          leftIcon={{
            name: 'telegram',
            type: 'font-awesome',
            color: '#0088cc',
          }}
          onPress={handleOnTelegramPress}
          title="Telegram chat"
        />
        <BlueListItem
          leftIcon={{
            name: 'github',
            type: 'font-awesome',
            color: 'black',
          }}
          onPress={handleOnGithubPress}
          title="GitHub"
        />
        <BlueCard>
          <View style={{ backgroundColor: '#f9f9f9', padding: 16, paddingTop: 0, borderRadius: 8 }}>
            <BlueSpacing20 />

            <BlueTextCentered>Built with the awesome 👍</BlueTextCentered>
            <BlueSpacing20 />
            <BlueTextCentered>React Native</BlueTextCentered>
            <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
            <BlueTextCentered>Nodejs</BlueTextCentered>
            <BlueTextCentered>Electrum server</BlueTextCentered>
          </View>
        </BlueCard>
        <BlueListItem
          leftIcon={{
            name: 'book',
            type: 'font-awesome',
            color: '#9AA0AA',
          }}
          chevron
          onPress={handleOnReleaseNotesPress}
          title="Release notes"
        />
        <BlueListItem
          leftIcon={{
            name: 'law',
            type: 'octicon',
            color: 'black',
          }}
          chevron
          onPress={handleOnLicensingPress}
          title="MIT License"
        />
        <BlueListItem
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
  title: loc.settings.about,
});
export default About;
