import React, { useCallback, useMemo } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, Text, TouchableOpacity, useWindowDimensions, View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformStyles } from '../../theme/platformStyles';
import type { IconProps } from '../../theme/platformStyles';

const branch = require('../../current-branch.json');

interface AboutItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  leftIcon?: IconProps | React.ReactElement;
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
  const { styles, colors, sizing, layout } = usePlatformStyles();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  // Standard Android header is 56dp + status bar height
  // For older Android versions, use a fallback if StatusBar.currentHeight is not available
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

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
      color: colors.textColor,
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
          <View
            style={[
              styles.card,
              localStyles.headerCard,
              {
                ...(Platform.OS === 'ios' && {
                  marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
                }),
                ...(layout.showBorderRadius && {
                  borderRadius: sizing.containerBorderRadius * 1.5,
                }),
              },
            ]}
          >
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
        id: 'x',
        title: '@bluewalletio',
        leftIcon: <Text style={localStyles.xIcon}>𝕏</Text>,
        onPress: handleOnXPress,
        section: 2,
      },
      {
        id: 'telegram',
        title: loc.settings.about_sm_telegram,
        leftIcon: <Icon name="telegram-plane" size={24} color={colors.textColor} />,
        onPress: handleOnTelegramPress,
        section: 2,
      },
      {
        id: 'github',
        title: loc.settings.about_sm_github,
        leftIcon: <Icon name="github" size={24} color={colors.textColor} />,
        onPress: handleOnGithubPress,
        section: 2,
      },
      {
        id: 'builtWith',
        title: '',
        customContent: (
          <View
            style={[
              styles.card,
              {
                ...(Platform.OS === 'ios' && {
                  marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
                }),
                ...(layout.showBorderRadius && {
                  borderRadius: sizing.containerBorderRadius * 1.5,
                }),
              },
            ]}
          >
            <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
            <BlueSpacing20 />
            <BlueTextCentered>React Native</BlueTextCentered>
            <BlueTextCentered>bitcoinjs-lib</BlueTextCentered>
            <BlueTextCentered>Nodejs</BlueTextCentered>
            <BlueTextCentered>Electrum server</BlueTextCentered>
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
        id: 'releaseNotes',
        title: loc.settings.about_release_notes,
        chevron: true,
        onPress: handleOnReleaseNotesPress,
        section: 3,
      },
      {
        id: 'licensing',
        title: loc.settings.about_license,
        chevron: true,
        onPress: handleOnLicensingPress,
        section: 3,
      },
      {
        id: 'selfTest',
        title: loc.settings.about_selftest,
        chevron: true,
        onPress: handleOnSelfTestPress,
        testID: 'RunSelfTestButton',
        section: 3,
      },
      {
        id: 'performanceTest',
        title: loc.settings.run_performance_test,
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
    localStyles.headerCard,
    localStyles.xIcon,
    sizing.contentContainerMarginHorizontal,
    sizing.containerBorderRadius,
    layout.showBorderRadius,
    handleOnRatePress,
    colors.textColor,
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
            containerStyle={[
              {
                backgroundColor: colors.cardBackground,
                marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
                ...(Platform.OS === 'android' &&
                  sizing.contentContainerPaddingHorizontal !== undefined && {
                    paddingHorizontal: sizing.contentContainerPaddingHorizontal,
                  }),
              },
              layout.showBorderRadius &&
                isFirstInSection && {
                  borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
                  borderTopRightRadius: sizing.containerBorderRadius * 1.5,
                },
              layout.showBorderRadius &&
                isLastInSection && {
                  borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
                  borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
                },
            ]}
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
          containerStyle={[
            {
              backgroundColor: colors.cardBackground,
              marginHorizontal: sizing.contentContainerMarginHorizontal || 0,
              ...(Platform.OS === 'android' &&
                sizing.contentContainerPaddingHorizontal !== undefined && {
                  paddingHorizontal: sizing.contentContainerPaddingHorizontal,
                }),
            },
            layout.showBorderRadius &&
              isFirstInSection && {
                borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
                borderTopRightRadius: sizing.containerBorderRadius * 1.5,
              },
            layout.showBorderRadius &&
              isLastInSection && {
                borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
                borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
              },
          ]}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          bottomDivider={!isLastInSection}
          isFirst={isFirstInSection}
          isLast={isLastInSection}
        />
      );
    },
    [
      styles.sectionHeaderContainer,
      styles.sectionHeaderText,
      aboutItems,
      colors.cardBackground,
      sizing.contentContainerMarginHorizontal,
      sizing.contentContainerPaddingHorizontal,
      sizing.containerBorderRadius,
      layout.showBorderRadius,
    ],
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
      testID="AboutScrollView"
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={{
        paddingHorizontal: sizing.contentContainerPaddingHorizontal || 0,
      }}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
      headerHeight={headerHeight}
    />
  );
};

export default About;
