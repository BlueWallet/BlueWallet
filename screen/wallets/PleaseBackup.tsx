import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, I18nManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { disallowScreenshot } from 'react-native-screen-capture';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation<NavigationProp>();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wortText: {
      color: colors.labelText,
    },
    pleaseText: {
      color: colors.foregroundColor,
    },
  });

  const handleBackButton = useCallback(() => {
    // @ts-ignore: Ignore
    navigation.getParent()?.pop();
    return true;
  }, [navigation]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    disallowScreenshot(isPrivacyBlurEnabled);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      disallowScreenshot(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderSecret = () => {
    const component: JSX.Element[] = [];
    const entries = wallet?.getSecret().split(/\s/).entries();
    if (entries) {
      for (const [index, secret] of entries) {
        if (secret) {
          const text = `${index + 1}. ${secret}  `;
          component.push(
            <View style={[styles.word, stylesHook.word]} key={index}>
              <Text style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple">
                {text}
              </Text>
            </View>,
          );
        }
      }
    }
    return component;
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.flex, stylesHook.flex]}
      testID="PleaseBackupScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.please}>
        <Text style={[styles.pleaseText, stylesHook.pleaseText]}>{loc.pleasebackup.text}</Text>
      </View>
      <View style={styles.list}>
        <View style={styles.secret}>{renderSecret()}</View>
      </View>
      <View style={styles.bottom}>
        <Button testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  word: {
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  wortText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  secret: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
});

export default PleaseBackup;
