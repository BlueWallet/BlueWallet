import React, { useContext } from 'react';
import { TouchableOpacity, ScrollView, Linking, Image, View, Text, useWindowDimensions, Platform, Alert } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import { getApplicationName, getVersion, getBundleId, getBuildNumber, getUniqueId, hasGmsSync } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
import { BlueButton, BlueCard, BlueListItem, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import Clipboard from '@react-native-clipboard/clipboard';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
import { HDSegwitBech32Wallet } from '../../class';
import styles from './style';

const A = require('../../blue_modules/analytics');
const branch = require('../../current-branch.json');

const About = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { isElectrumDisabled } = useContext(BlueStorageContext);
  

  const handleOnReleaseNotesPress = () => {
    navigate('ReleaseNotes');
  };

  const handleOnSelfTestPress = () => {
    if (isElectrumDisabled) {
      alert(loc.settings.about_selftest_electrum_disabled);
    } else {
      navigate('Selftest');
    }
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
          <Text style={[styles.textBackup,{color: colors.foregroundColor}]}>{formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}</Text>
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
        <View style={[styles.buildWith,{backgroundColor: colors.inputBackgroundColor,}]}>
          <BlueSpacing20 />

          <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>React Native</BlueTextCentered>
          <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
          <BlueTextCentered>Nodejs</BlueTextCentered>
          <BlueTextCentered>Electrum server</BlueTextCentered>
          <BlueSpacing20 />

          <TouchableOpacity accessibilityRole="button" onPress={handleOnGithubPress} style={[styles.buttonLink,{backgroundColor: colors.lightButton}]}>
            <Icon size={22} name="github" type="font-awesome-5" color={colors.foregroundColor} />
            <Text style={[styles.textLink,{color: colors.foregroundColor,}]}>{formatStringAddTwoWhiteSpaces(loc.settings.about_sm_github)}</Text>
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
          name: 'balance-scale',
          type: 'font-awesome',
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
      <BlueListItem
        leftIcon={{
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        }}
        chevron
        onPress={async () => {
          const secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
          const w = new HDSegwitBech32Wallet();
          w.setSecret(secret);

          const start = Date.now();
          let num;
          for (num = 0; num < 1000; num++) {
            w._getExternalAddressByIndex(num);
            if (Date.now() - start > 10 * 1000) {
              break;
            }
          }

          Alert.alert(loc.formatString(loc.settings.performance_score, { num }));
        }}
        title={loc.settings.run_performance_test}
      />
      <BlueSpacing20 />
      <BlueSpacing20 />
      <BlueTextCentered>
        {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
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
            const stringToCopy = 'userId:' + getUniqueId();
            A.logError('copied unique id');
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
