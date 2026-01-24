import React, { useCallback } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, Text, TouchableOpacity, useWindowDimensions, View, StyleSheet } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
import Icon from 'react-native-vector-icons/FontAwesome5';
import A from '../../blue_modules/analytics';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';
import {
  SettingsCard,
  SettingsFlatList,
  SettingsListItem,
  SettingsSection,
  SettingsSectionHeader,
  SettingsIconName,
} from '../../components/platform';
import { useTheme } from '../../components/themes';

const branch = require('../../current-branch.json');

type IconProps = {
  name: string;
  type: string;
  color: string;
  backgroundColor?: string;
};

interface AboutItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  leftIcon?: IconProps | React.ReactElement;
  iconName?: SettingsIconName;
  onPress?: () => void;
  chevron?: boolean;
  section?: number;
  testID?: string;
  customContent?: React.ReactNode;
}

const About: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { width, height } = useWindowDimensions();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const localStyles = StyleSheet.create({
    sectionSpacing: {
      height: 16,
    },
    headerCard: {
      backgroundColor: 'transparent',
      ...(Platform.OS === 'android' && {
        borderRadius: 0,
        elevation: 0,
        marginHorizontal: 0,
        marginVertical: 0,
      }),
    },
    xIcon: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foregroundColor,
    },
  });

  const styles = StyleSheet.create({
    card: {
      marginVertical: 8,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 8,
      resizeMode: 'contain',
    },
    textFree: {
      marginTop: 12,
      fontSize: 16,
      color: colors.foregroundColor,
      textAlign: 'center',
    },
    textBackup: {
      marginTop: 8,
      fontSize: 14,
      color: colors.alternativeTextColor,
      textAlign: 'center',
    },
    headerButton: {
      marginTop: 12,
    },
    sectionSpacing: {
      height: 16,
    },
    footerContainer: {
      marginTop: 16,
    },
    footerText: {
      fontSize: 12,
      color: colors.alternativeTextColor,
      textAlign: 'center',
      marginBottom: 4,
    },
    copyToClipboard: {
      marginTop: 8,
      alignItems: 'center',
    },
    copyToClipboardText: {
      fontSize: 12,
      color: colors.foregroundColor,
    },
  });

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

  const handleOnRatePress = useCallback(() => {
    const options = {
      AppleAppID: '1376878040',
      GooglePackageName: 'io.bluewallet.bluewallet',
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: Platform.OS !== 'android',
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: 'https://bluewallet.io',
    };
    Rate.rate(options, (success: boolean) => {
      if (success) {
        console.log('User Rated.');
      }
    });
  }, []);

  const handlePerformanceTest = useCallback(async () => {
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
  }, []);

  const aboutItems = useCallback((): AboutItem[] => {
    const items: AboutItem[] = [
      {
        id: 'header',
        title: '',
        customContent: (
          <SettingsSection compact>
            <SettingsCard style={[styles.card, localStyles.headerCard]}>
              <View style={styles.center}>
                <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
                <Text style={styles.textFree}>{loc.settings.about_free}</Text>
                <Text style={styles.textBackup}>{formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}</Text>
                {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
                  <View style={styles.headerButton}>
                    <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
                  </View>
                )}
              </View>
            </SettingsCard>
          </SettingsSection>
        ),
        section: 1,
      },
      {
        id: 'x',
        title: '@bluewalletio',
        leftIcon: <Text style={localStyles.xIcon}>𝕏</Text>,
        onPress: handleOnXPress,
        section: 2,
      },
      {
        id: 'telegram',
        title: loc.settings.about_sm_telegram,
        leftIcon: <Icon name="telegram-plane" size={24} color={colors.foregroundColor} />,
        onPress: handleOnTelegramPress,
        section: 2,
      },
      {
        id: 'github',
        title: loc.settings.about_sm_github,
        leftIcon: <Icon name="github" size={24} color={colors.foregroundColor} />,
        onPress: handleOnGithubPress,
        section: 2,
      },
      {
        id: 'builtWith',
        title: '',
        customContent: (
          <SettingsSection compact>
            <SettingsCard style={styles.card}>
              <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
              <BlueSpacing20 />
              <BlueTextCentered>React Native</BlueTextCentered>
              <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
              <BlueTextCentered>Nodejs</BlueTextCentered>
              <BlueTextCentered>Electrum server</BlueTextCentered>
            </SettingsCard>
          </SettingsSection>
        ),
        section: 2.5,
      },
      {
        id: 'sectionSpacing1',
        title: '',
        customContent: <View style={styles.sectionSpacing} />,
        section: 2.9,
      },
      {
        id: 'releaseNotes',
        title: loc.settings.about_release_notes,
        iconName: 'releaseNotes',
        chevron: true,
        onPress: handleOnReleaseNotesPress,
        section: 3,
      },
      {
        id: 'licensing',
        title: loc.settings.about_license,
        iconName: 'licensing',
        chevron: true,
        onPress: handleOnLicensingPress,
        section: 3,
      },
      {
        id: 'selfTest',
        title: loc.settings.about_selftest,
        iconName: 'selfTest',
        chevron: true,
        onPress: handleOnSelfTestPress,
        testID: 'RunSelfTestButton',
        section: 3,
      },
      {
        id: 'performanceTest',
        title: loc.settings.run_performance_test,
        iconName: 'performance',
        chevron: true,
        onPress: handlePerformanceTest,
        section: 3,
      },
      {
        id: 'footer',
        title: '',
        customContent: (
          <View style={styles.footerContainer}>
            <BlueSpacing20 />
            <Text style={styles.footerText}>
              {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
            </Text>
            <Text style={styles.footerText}>{new Date(Number(getBuildNumber()) * 1000).toUTCString()}</Text>
            <Text style={styles.footerText}>{getBundleId()}</Text>
            <Text style={styles.footerText}>
              w, h = {width}, {height}
            </Text>
            <Text style={styles.footerText}>Unique ID: {getUniqueIdSync()}</Text>
            <View style={styles.copyToClipboard}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  const stringToCopy = 'userId:' + getUniqueIdSync();
                  A.logError('copied unique id');
                  Clipboard.setString(stringToCopy);
                }}
              >
                <Text style={styles.copyToClipboardText}>{loc.transactions.details_copy}</Text>
              </TouchableOpacity>
            </View>
            <BlueSpacing20 />
          </View>
        ),
        section: 4,
      },
    ];
    return items;
  }, [
    styles.card,
    styles.center,
    styles.logo,
    styles.textFree,
    styles.textBackup,
    styles.sectionSpacing,
    styles.footerContainer,
    styles.footerText,
    styles.copyToClipboard,
    styles.copyToClipboardText,
    styles.headerButton,
    localStyles.headerCard,
    localStyles.xIcon,
    colors.foregroundColor,
    handleOnRatePress,
    handleOnXPress,
    handleOnTelegramPress,
    handleOnGithubPress,
    handleOnReleaseNotesPress,
    handleOnLicensingPress,
    handleOnSelfTestPress,
    handlePerformanceTest,
    width,
    height,
  ]);

  const renderItem = useCallback(
    (props: { item: AboutItem }) => {
      const item = props.item;

      if (item.customContent) {
        return <>{item.customContent}</>;
      }

      if (item.title && !item.leftIcon && !item.onPress && item.section) {
        return <SettingsSectionHeader title={item.title} />;
      }

      const currentSection = Math.floor(item.section || 0);
      const sectionItems = aboutItems().filter(
        i => Math.floor(i.section || 0) === currentSection && !i.customContent && (i.onPress || i.leftIcon || i.chevron || i.subtitle),
      );
      const indexInSection = sectionItems.findIndex(i => i.id === item.id);
      const isFirstInSection = indexInSection === 0;
      const isLastInSection = indexInSection === sectionItems.length - 1;
      const position = isFirstInSection && isLastInSection ? 'single' : isFirstInSection ? 'first' : isLastInSection ? 'last' : 'middle';

      return (
        <SettingsListItem
          title={item.title}
          subtitle={item.subtitle}
          leftIcon={item.leftIcon}
          iconName={item.iconName}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          position={position}
        />
      );
    },
    [aboutItems],
  );

  const keyExtractor = useCallback((item: AboutItem, index: number) => `${item.id}-${index}`, []);

  const ListFooterComponent = useCallback(() => <View style={localStyles.sectionSpacing} />, [localStyles.sectionSpacing]);

  return (
    <SettingsFlatList
      data={aboutItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      testID="AboutScrollView"
      ListFooterComponent={ListFooterComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default About;
