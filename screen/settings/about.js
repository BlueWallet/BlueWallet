import React from 'react';
import { TouchableOpacity, ScrollView, Linking, Image, View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import { getApplicationName, getVersion, getBundleId, getBuildNumber, getUniqueId, hasGmsSync } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';

import { BlueButton, BlueCard, BlueListItem, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import Clipboard from '@react-native-clipboard/clipboard';
import Bugsnag from '@bugsnag/react-native';

const About = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const styles = StyleSheet.create({
    copyToClipboard: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    copyToClipboardText: {
      fontSize: 13,
      fontWeight: '400',
      color: '#68bbe1',
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
    buttonLink: {
      backgroundColor: colors.lightButton,
      borderRadius: 12,
      justifyContent: 'center',
      padding: 8,
      flexDirection: 'row',
    },
    textLink: {
      color: colors.foregroundColor,
      marginLeft: 8,
      fontWeight: '600',
    },
  });

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

  const handleOnDiscordPress = () => {
    Linking.openURL('https://discord.gg/btWq2Aby2z');
  };

  const handleOnTelegramPress = () => {
    Linking.openURL('https://t.me/bluewallethat');
  };
  const handleOnGithubPress = () => {
    Linking.openURL('https://github.com/BlueWallet/BlueWallet');
  };
  const handleOnRatePress = () => {
    const options = {
      AppleAppID: '1376878040',
      GooglePackageName: 'io.bluewallet.bluewallet',
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: Platform.OS !== 'android',
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: 'https://bluewallet.io',
    };
    Rate.rate(options, success => {
      if (success) {
        console.log('User Rated.');
      }
    });
  };

  return (
    <ScrollView testID="AboutScrollView" contentInsetAdjustmentBehavior="automatic">
      <BlueCard>
        <View style={styles.center}>
          <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
          <Text style={styles.textFree}>{loc.settings.about_free}</Text>
          <Text style={styles.textBackup}>{formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}</Text>
          {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
            <BlueButton onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
          )}
        </View>
      </BlueCard>
      <BlueListItem
        leftIcon={{
          name: 'twitter',
          type: 'font-awesome',
          color: '#1da1f2',
        }}
        onPress={handleOnTwitterPress}
        title={loc.settings.about_sm_twitter}
      />
      <BlueListItem
        leftIcon={{
          name: 'telegram',
          type: 'font-awesome',
          color: '#0088cc',
        }}
        onPress={handleOnTelegramPress}
        title={loc.settings.about_sm_telegram}
      />
      <BlueListItem
        leftIcon={{
          name: 'discord',
          type: 'font-awesome-5',
          color: '#7289da',
        }}
        onPress={handleOnDiscordPress}
        title={loc.settings.about_sm_discord}
      />
      <BlueCard>
        <View style={styles.buildWith}>
          <BlueSpacing20 />

          <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>React Native</BlueTextCentered>
          <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
          <BlueTextCentered>Nodejs</BlueTextCentered>
          <BlueTextCentered>Electrum server</BlueTextCentered>
          <BlueSpacing20 />

          <TouchableOpacity accessibilityRole="button" onPress={handleOnGithubPress} style={styles.buttonLink}>
            <Icon size={22} name="github" type="font-awesome-5" color={colors.foregroundColor} />
            <Text style={styles.textLink}>{formatStringAddTwoWhiteSpaces(loc.settings.about_sm_github)}</Text>
          </TouchableOpacity>
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
        title={loc.settings.about_release_notes}
      />
      <BlueListItem
        leftIcon={{
          name: 'law',
          type: 'octicon',
          color: colors.foregroundColor,
        }}
        chevron
        onPress={handleOnLicensingPress}
        title={loc.settings.about_license}
      />
      <BlueListItem
        leftIcon={{
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        }}
        chevron
        onPress={handleOnSelfTestPress}
        testID="RunSelfTestButton"
        title={loc.settings.about_selftest}
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
      <BlueTextCentered>Unique ID: {getUniqueId()}</BlueTextCentered>
      <View style={styles.copyToClipboard}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            const stringToCopy = 'user.id:' + getUniqueId();
            Bugsnag.notify(new Error('copied unique id'));
            Clipboard.setString(stringToCopy);
          }}
        >
          <Text style={styles.copyToClipboardText}>{loc.transactions.details_copy}</Text>
        </TouchableOpacity>
      </View>
      <BlueSpacing20 />
      <BlueSpacing20 />
    </ScrollView>
  );
};

About.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.about }));
export default About;
