import React, { useEffect, useState, useCallback, useContext } from 'react';
import { ActivityIndicator, View, BackHandler, Text, ScrollView, StyleSheet, I18nManager } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { SafeBlueArea, BlueButton } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import styles from './style';

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
    <View style={[stylesHook.flex,{flex: 1,justifyContent: 'center',}]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.flex}>
      <ScrollView contentContainerStyle={ {flex: 1,justifyContent: 'space-around',}} testID="PleaseBackupScrollView">
        <View style={styles.please}>
          <Text style={[styles.pleaseText, stylesHook.pleaseText]}>{loc.pleasebackup.text}</Text>
        </View>
        <View style={{flexGrow: 8,paddingHorizontal: 16,}}>
          <View style={styles.secret}>{renderSecret()}</View>
        </View>
        <View style={styles.bottom}>
          <BlueButton testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

PleaseBackup.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.pleasebackup.title }),
);



export default PleaseBackup;
