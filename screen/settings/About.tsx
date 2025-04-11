import React, { useCallback } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
import { usePlatformTheme } from '../../components/platformThemes';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';

const branch = require('../../current-branch.json');

interface AboutItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  leftIcon?: {
    name: string;
    type: string;
    color: string;
  };
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
  const { colors: platformColors, sizing, layout } = usePlatformTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius * 1.5,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: 16,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius * 1.5,
      padding: 16,
      marginVertical: 8,
    },
    copyToClipboard: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    copyToClipboardText: {
      fontSize: 13,
      fontWeight: '400',
      color: '#68bbe1',
    },
    logo: {
      width: 102,
      height: 124,
    },
    textFree: {
      maxWidth: 260,
      marginVertical: 24,
      color: platformColors.subtitleColor,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
    },
    textBackup: {
      maxWidth: 260,
      marginBottom: 40,
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500',
      color: platformColors.titleColor,
    },
    buildWith: {
      padding: 16,
      paddingTop: 0,
      borderRadius: sizing.containerBorderRadius * 1.5,
      backgroundColor: platformColors.cardBackground,
    },

    sectionSpacing: {
      height: 24,
    },
    sectionHeaderContainer: {
      marginTop: 16,
      marginBottom: 8,

      paddingHorizontal: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: platformColors.titleColor,
    },
    footerContainer: {
      padding: 16,
      alignItems: 'center',
    },
    footerText: {
      color: platformColors.subtitleColor,
      fontSize: 13,
      marginBottom: 4,
      textAlign: 'center',
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

  const handleOnTwitterPress = useCallback(() => {
    Linking.openURL('https://twitter.com/bluewalletio');
  }, []);

  const handleOnDiscordPress = useCallback(() => {
    Linking.openURL('https://discord.gg/btWq2Aby2z');
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

  const handlePerfomanceTest = useCallback(async () => {
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
        id: 'twitter',
        title: loc.settings.about_sm_twitter,
        leftIcon: {
          name: 'twitter',
          type: 'font-awesome',
          color: '#1da1f2',
        },
        onPress: handleOnTwitterPress,
        section: 2,
      },
      {
        id: 'telegram',
        title: loc.settings.about_sm_telegram,
        leftIcon: {
          name: 'telegram',
          type: 'font-awesome',
          color: '#0088cc',
        },
        onPress: handleOnTelegramPress,
        section: 2,
      },
      {
        id: 'discord',
        title: loc.settings.about_sm_discord,
        leftIcon: {
          name: 'discord',
          type: 'font-awesome-5',
          color: '#7289da',
        },
        onPress: handleOnDiscordPress,
        section: 2,
      },
      {
        id: 'github',
        title: loc.settings.about_sm_github,
        leftIcon: {
          name: 'github',
          type: 'font-awesome-5',
          color: platformColors.titleColor as string,
        },
        onPress: handleOnGithubPress,
        section: 2,
      },
      {
        id: 'buildWith',
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
        leftIcon: {
          name: 'book',
          type: 'font-awesome',
          color: '#9AA0AA',
        },
        chevron: true,
        onPress: handleOnReleaseNotesPress,
        section: 3,
      },
      {
        id: 'licensing',
        title: loc.settings.about_license,
        leftIcon: {
          name: 'balance-scale',
          type: 'font-awesome',
          color: platformColors.titleColor as string, // Fixed: changed 'z' to 'color'
        },
        chevron: true,
        onPress: handleOnLicensingPress,
        section: 3,
      },
      {
        id: 'selfTest',
        title: loc.settings.about_selftest,
        leftIcon: {
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        },
        chevron: true,
        onPress: handleOnSelfTestPress,
        testID: 'RunSelfTestButton',
        section: 3,
      },
      {
        id: 'performanceTest',
        title: loc.settings.run_performance_test,
        leftIcon: {
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        },
        chevron: true,
        onPress: handlePerfomanceTest,
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
    styles,
    handleOnRatePress,
    handleOnTwitterPress,
    handleOnTelegramPress,
    handleOnDiscordPress,
    handleOnGithubPress,
    handleOnReleaseNotesPress,
    handleOnLicensingPress,
    handleOnSelfTestPress,
    handlePerfomanceTest,
    platformColors.titleColor,
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
        const sectionMap: Record<number, string[]> = {
          2: ['twitter', 'telegram', 'discord', 'github'], // Social section items
          3: ['releaseNotes', 'licensing', 'selfTest', 'performanceTest'], // Tools section items
        };

        const sectionNumber = Math.floor(item.section || 0);

        if (sectionMap[sectionNumber] && sectionMap[sectionNumber].includes(item.id)) {
          const sectionItems = sectionMap[sectionNumber];
          const indexInVisualSection = sectionItems.indexOf(item.id);
          const isFirstVisual = indexInVisualSection === 0;
          const isLastVisual = indexInVisualSection === sectionItems.length - 1;

          const containerStyle = {
            ...styles.listItemContainer,
            borderTopLeftRadius: isFirstVisual ? sizing.containerBorderRadius : 0,
            borderTopRightRadius: isFirstVisual ? sizing.containerBorderRadius : 0,
            borderBottomLeftRadius: isLastVisual ? sizing.containerBorderRadius : 0,
            borderBottomRightRadius: isLastVisual ? sizing.containerBorderRadius : 0,
          };

          return (
            <PlatformListItem
              title={item.title}
              subtitle={item.subtitle}
              containerStyle={containerStyle}
              leftIcon={item.leftIcon}
              onPress={item.onPress}
              testID={item.testID}
              chevron={item.chevron}
              isFirst={isFirstVisual}
              isLast={isLastVisual}
              bottomDivider={layout.showBorderBottom && !isLastVisual}
            />
          );
        }

        // For other interactive items not in our explicit section maps
        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={styles.listItemContainer}
            leftIcon={item.leftIcon}
            onPress={item.onPress}
            testID={item.testID}
            chevron={item.chevron}
            bottomDivider={layout.showBorderBottom}
          />
        );
      }

      // For any other non-interactive items
      return (
        <PlatformListItem
          title={item.title}
          subtitle={item.subtitle}
          containerStyle={styles.listItemContainer}
          onPress={item.onPress}
          testID={item.testID}
          chevron={item.chevron}
          bottomDivider={layout.showBorderBottom}
        />
      );
    },
    [
      styles.listItemContainer,
      styles.sectionHeaderContainer,
      styles.sectionHeaderText,
      layout.showBorderBottom,
      sizing.containerBorderRadius,
    ],
  );

  const keyExtractor = useCallback((item: AboutItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={aboutItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default About;
