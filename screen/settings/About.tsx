import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { Alert, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Icon from '@react-native-vector-icons/fontawesome6';

import A from '../../blue_modules/analytics';
import BlueTextCentered from '../../components/BlueTextCentered';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import presentAlert from '../../components/Alert';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { SettingsSection, SettingsListItem } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';

const branch = require('../../current-branch.json');

const About: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();

  const handleOnReleaseNotesPress = useCallback(() => {
    navigate('ReleaseNotes');
  }, [navigate]);

  const handleOnSelfTestPress = useCallback(() => {
    if (isElectrumDisabled) {
      presentAlert({ message: loc.settings.about_selftest_electrum_disabled });
    } else {
      navigate('SelfTest');
    }
  }, [isElectrumDisabled, navigate]);

  const handleOnLicensingPress = useCallback(() => {
    navigate('Licensing');
  }, [navigate]);

  const handleOnXPress = useCallback(() => {
    Linking.openURL('https://x.com/bluewalletio');
  }, []);

  const handleOnTelegramPress = useCallback(() => {
    Linking.openURL('https://t.me/bluewallethat');
  }, []);

  const handleOnGithubPress = useCallback(() => {
    Linking.openURL('https://github.com/BlueWallet/BlueWallet');
  }, []);

  const handleOnRatePress = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://itunes.apple.com/app/bluewallet-bitcoin-wallet/id1376878040');
      } else {
        await Linking.openURL('https://play.google.com/store/apps/details?id=io.bluewallet.bluewallet');
      }
    } catch (error: any) {
      console.error('Rate app failed:', error.message);
    }
  }, []);

  const handlePerformanceTest = useCallback(async () => {
    const secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const w = new HDSegwitBech32Wallet();
    w.setSecret(secret);

    const start = Date.now();
    let num;
    for (num = 0; num < 10000; num++) {
      w._getExternalAddressByIndex(num);
      if (Date.now() - start > 10 * 1000) {
        break;
      }
    }

    Alert.alert(loc.formatString(loc.settings.performance_score, { num }));
  }, []);

  return (
    <SafeAreaScrollView testID="AboutScrollView">
      <View style={styles.center}>
        <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
        <Text style={[styles.textFree, { color: colors.foregroundColor }]}>{loc.settings.about_free}</Text>
        <Text style={[styles.textBackup, { color: colors.alternativeTextColor }]}>
          {formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}
        </Text>
        {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
          <View style={styles.headerButton}>
            <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
          </View>
        )}
      </View>

      <SettingsSection>
        <SettingsListItem
          title="@bluewalletio"
          leftAvatar={<Text style={[styles.xIcon, { color: colors.foregroundColor }]}>𝕏</Text>}
          onPress={handleOnXPress}
        />
        <SettingsListItem
          title={loc.settings.about_sm_telegram}
          leftAvatar={<Icon name="telegram" size={24} color={colors.foregroundColor} iconStyle="brand" />}
          onPress={handleOnTelegramPress}
        />
        <SettingsListItem
          title={loc.settings.about_sm_github}
          leftAvatar={<Icon name="github" size={24} color={colors.foregroundColor} iconStyle="brand" />}
          onPress={handleOnGithubPress}
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <View style={styles.builtWithContent}>
          <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>React Native</BlueTextCentered>
          <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
          <BlueTextCentered>Electrum server</BlueTextCentered>
        </View>
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem title={loc.settings.about_release_notes} iconName="releaseNotes" chevron onPress={handleOnReleaseNotesPress} />
        <SettingsListItem title={loc.settings.about_license} iconName="licensing" chevron onPress={handleOnLicensingPress} />
        <SettingsListItem
          title={loc.settings.about_selftest}
          iconName="selfTest"
          chevron
          onPress={handleOnSelfTestPress}
          testID="RunSelfTestButton"
        />
        <SettingsListItem
          title={loc.settings.run_performance_test}
          iconName="performance"
          chevron
          onPress={handlePerformanceTest}
          bottomDivider={false}
        />
      </SettingsSection>

      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
          {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
        </Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
          {new Date(Number(getBuildNumber()) * 1000).toUTCString()}
        </Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>{getBundleId()}</Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>Unique ID: {getUniqueIdSync()}</Text>
        <View style={styles.copyToClipboard}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              const stringToCopy = 'userId:' + getUniqueIdSync();
              A.logError('copied unique id');
              Clipboard.setString(stringToCopy);
            }}
          >
            <Text style={[styles.copyToClipboardText, { color: colors.foregroundColor }]}>{loc.transactions.details_copy}</Text>
          </TouchableOpacity>
        </View>
        <BlueSpacing20 />
      </View>
    </SafeAreaScrollView>
  );
};

export default About;

const styles = StyleSheet.create({
  xIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  textFree: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  textBackup: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  headerButton: {
    marginTop: 16,
  },
  builtWithContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  footerContainer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  copyToClipboard: {
    marginTop: 8,
    alignItems: 'center',
  },
  copyToClipboardText: {
    fontSize: 12,
  },
});
