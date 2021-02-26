import React, { useEffect, useState, useCallback, useContext } from 'react';
import { ActivityIndicator, View, BackHandler, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueSpacing20, SafeBlueArea, BlueText, BlueButton } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const PleaseBackup = () => {
  const { wallets } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
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

    successText: {
      color: colors.foregroundColor,
    },
    pleaseText: {
      color: colors.foregroundColor,
    },
  });

  const handleBackButton = useCallback(() => {
    navigation.dangerouslyGetParent().pop();
    return true;
  }, [navigation]);

  useEffect(() => {
    Privacy.enableBlur();
    setIsLoading(false);
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderSecret = () => {
    const component = [];
    for (const [index, secret] of wallet.getSecret().split(/\s/).entries()) {
      const text = `${index + 1}. ${secret}  `;
      component.push(
        <View style={[styles.word, stylesHook.word]} key={`${index}`}>
          <Text style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple">
            {text}
          </Text>
        </View>,
      );
    }
    return component;
  };

  return isLoading ? (
    <View style={[styles.loading, stylesHook.flex]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={[styles.flex, stylesHook.flex]}>
      <StatusBar barStyle="default" />
      <ScrollView testID="PleaseBackupScrollView">
        <View style={styles.please}>
          <BlueText style={[styles.successText, stylesHook.successText]}>{loc.pleasebackup.success}</BlueText>
          <BlueText style={[styles.pleaseText, stylesHook.pleaseText]}>{loc.pleasebackup.text}</BlueText>

          <View style={styles.secret}>{renderSecret()}</View>

          <BlueSpacing20 />
          <BlueButton testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

PleaseBackup.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
    headerRight: null,
    gestureEnabled: false,
    swipeEnabled: false,
  },
  opts => ({ ...opts, title: loc.pleasebackup.title }),
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
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
  },
  please: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pleaseText: {
    paddingBottom: 10,
    paddingRight: 0,
    paddingLeft: 0,
  },
  secret: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
  },
});

export default PleaseBackup;
