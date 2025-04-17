import React, { useCallback } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, Text, TouchableOpacity, useWindowDimensions, View, StyleSheet } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
import A from '../../blue_modules/analytics';
import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { useStandardIcons } from '../../hooks/useStandardIcons';
import { usePlatformTheme } from '../../components/platformThemes';

const branch = require('../../current-branch.json');

interface AboutItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  leftIcon?: any;
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
  const { styles } = useSettingsStyles();
  const getIcon = useStandardIcons();
  const { colors: platformColors } = usePlatformTheme();

  const localStyles = StyleSheet.create({
    sectionSpacing: {
      height: 16,
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
    Linking.openURL('https://twitter.com/bluewalletio');
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
    Rate.rate(options, success => {
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
          <View style={styles.card}>
            <View style={styles.center}>
              <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
              <Text style={styles.textFree}>{loc.settings.about_free}</Text>
              <Text style={styles.textBackup}>{formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}</Text>
              {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
                <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
              )}
            </View>
          </View>
        ),
        section: 1,
      },
      {
        id: 'socialHeader',
        title: loc.settings.social,
        section: 2,
      },
      {
        id: 'x',
        title: loc.settings.about_sm_x,
        leftIcon: getIcon('x-twitter'),

        onPress: handleOnXPress,
        section: 2,
      },
      {
        id: 'telegram',
        title: loc.settings.about_sm_telegram,
        leftIcon: getIcon('telegram'),
        onPress: handleOnTelegramPress,
        section: 2,
      },
      {
        id: 'github',
        title: loc.settings.about_sm_github,
        leftIcon: getIcon('github'),
        onPress: handleOnGithubPress,
        section: 2,
      },
      {
        id: 'builtWith',
        title: '',
        customContent: (
          <View style={styles.card}>
            <View style={styles.buildWith}>
              <BlueSpacing20 />
              <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
              <BlueSpacing20 />
              <BlueTextCentered>React Native</BlueTextCentered>
              <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
              <BlueTextCentered>Nodejs</BlueTextCentered>
              <BlueTextCentered>Electrum server</BlueTextCentered>
              <BlueSpacing20 />
            </View>
          </View>
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
        id: 'toolsHeader',
        title: loc.settings.tools,
        section: 3,
      },
      {
        id: 'releaseNotes',
        title: loc.settings.about_release_notes,
        leftIcon: getIcon('releaseNotes'),
        chevron: true,
        onPress: handleOnReleaseNotesPress,
        section: 3,
      },
      {
        id: 'licensing',
        title: loc.settings.about_license,
        leftIcon: getIcon('licensing'),
        chevron: true,
        onPress: handleOnLicensingPress,
        section: 3,
      },
      {
        id: 'selfTest',
        title: loc.settings.about_selftest,
        leftIcon: getIcon('selfTest'),
        chevron: true,
        onPress: handleOnSelfTestPress,
        testID: 'RunSelfTestButton',
        section: 3,
      },
      {
        id: 'performanceTest',
        title: loc.settings.run_performance_test,
        leftIcon: getIcon('performance'),
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
    styles.buildWith,
    styles.sectionSpacing,
    styles.footerContainer,
    styles.footerText,
    styles.copyToClipboard,
    styles.copyToClipboardText,
    handleOnRatePress,
    getIcon,
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
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }

      if (item.leftIcon && item.onPress) {
        const currentSection = Math.floor(item.section || 0);
        const sectionItems = aboutItems().filter(i => Math.floor(i.section || 0) === currentSection && i.leftIcon && i.onPress);

        const indexInSection = sectionItems.findIndex(i => i.id === item.id);

        const isFirstInSection = indexInSection === 0;
        const isLastInSection = indexInSection === sectionItems.length - 1;

        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={{
              backgroundColor: platformColors.cardBackground,
            }}
            leftIcon={item.leftIcon}
            onPress={item.onPress}
            testID={item.testID}
            chevron={item.chevron}
            bottomDivider={!isLastInSection}
            isFirst={isFirstInSection}
            isLast={isLastInSection}
          />
        );
      }

      const currentSection = Math.floor(item.section || 0);
      const sectionItems = aboutItems().filter(i => Math.floor(i.section || 0) === currentSection);

      const indexInSection = sectionItems.findIndex(i => i.id === item.id);
      const isLastInSection = indexInSection === sectionItems.length - 1;
      const isFirstInSection = indexInSection === 0;

      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          bottomDivider={!isLastInSection}
          isFirst={isFirstInSection}
          isLast={isLastInSection}
        />
      );
    },
    [styles.sectionHeaderContainer, styles.sectionHeaderText, aboutItems, platformColors.cardBackground],
  );

  const keyExtractor = useCallback((item: AboutItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  const ListFooterComponent = useCallback(() => <View style={localStyles.sectionSpacing} />, [localStyles.sectionSpacing]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={aboutItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default About;
