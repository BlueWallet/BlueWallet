import React, { useEffect, useState } from 'react';
import { ScrollView, Linking, Dimensions } from 'react-native';
import { useNavigation } from 'react-navigation-hooks';
import {
  BlueTextCentered,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueNavigationStyle,
} from '../../BlueComponents';
import { getApplicationName, getVersion, getBundleId, getBuildNumber } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const { width, height } = Dimensions.get('window');
const loc = require('../../loc/');

const About = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();

  useEffect(() => {
    setIsLoading(false);
  });

  const handleOnReleaseNotesPress = () => {
    navigate('ReleaseNotes');
  };

  const handleOnSelfTestPress = () => {
    navigate('Selftest');
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
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
      <ScrollView>
        <BlueCard>
          <BlueTextCentered h4>BlueWallet is a free and open source Bitcoin wallet. Licensed MIT.</BlueTextCentered>
          <BlueSpacing20 />

          <BlueTextCentered h4>Always backup your keys</BlueTextCentered>
          <BlueSpacing20 />

          <BlueButton
            icon={{
              name: 'github',
              type: 'font-awesome',
              color: BlueApp.settings.buttonTextColor,
            }}
            onPress={handleOnGithubPress}
            title="github.com/BlueWallet/BlueWallet"
          />
          <BlueSpacing20 />

          <BlueButton
            icon={{
              name: 'twitter',
              type: 'font-awesome',
              color: BlueApp.settings.buttonTextColor,
            }}
            onPress={handleOnTwitterPress}
            title="Follow us on Twitter"
          />
          <BlueSpacing20 />

          <BlueButton
            icon={{
              name: 'telegram',
              type: 'font-awesome',
              color: BlueApp.settings.buttonTextColor,
            }}
            onPress={handleOnTelegramPress}
            title="Join Telegram chat"
          />
          <BlueSpacing20 />

          <BlueButton
            icon={{
              name: 'thumbs-up',
              type: 'font-awesome',
              color: BlueApp.settings.buttonTextColor,
            }}
            onPress={handleOnRatePress}
            title="Rate BlueWallet"
          />

          <BlueSpacing20 />
          <BlueText h3>Built with awesome:</BlueText>
          <BlueSpacing20 />
          <BlueText h4>* React Native</BlueText>
          <BlueText h4>* Bitcoinjs-lib</BlueText>
          <BlueText h4>* blockcypher.com API</BlueText>
          <BlueText h4>* Nodejs</BlueText>
          <BlueText h4>* react-native-elements</BlueText>
          <BlueText h4>* rn-nodeify</BlueText>
          <BlueText h4>* bignumber.js</BlueText>
          <BlueSpacing20 />

          <BlueButton onPress={handleOnReleaseNotesPress} title="Release notes" />
          <BlueSpacing20 />

          <BlueButton onPress={handleOnSelfTestPress} title="Run self test" />
          <BlueTextCentered />
          <BlueTextCentered>
            {getApplicationName()} ver {getVersion()} (build {getBuildNumber()})
          </BlueTextCentered>
          <BlueTextCentered>{new Date(getBuildNumber() * 1000).toGMTString()}</BlueTextCentered>
          <BlueTextCentered>{getBundleId()}</BlueTextCentered>
          <BlueTextCentered>
            w, h = {width}, {height}
          </BlueTextCentered>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

About.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.about,
});
export default About;
