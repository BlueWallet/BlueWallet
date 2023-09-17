import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueButton, BlueSpacing20 } from '../../BlueComponents';
import loc from '../../loc';

const WalletsAddBorder = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { walletLabel = loc.multisig.default_label, seedPhrase } = useRoute().params;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    }
  });

  const onLetsStartPress = () => {
    navigate('WalletsAddBorderSaveGrid', { walletLabel, seedPhrase });
  };

  return (
    <SafeAreaView style={stylesHook.root}>
      <View style={styles.descriptionContainer}>
        <View style={styles.imageWrapper}>
          <Image style={{ width: 102, height: 102 }} source={require('../../img/addWallet/border.png')} />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          A border wallet allows the easy memorization of 
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {" "}a seed phrase.
          </Text>
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          You will choose and memorize an 11 or 23 square
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {" "}pattern on a grid
          </Text>
	        {" "}as well as a
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {" "}final word
          </Text>
            {" "}instead of memorizing every word.
        </Text>
    
        <BlueSpacing20 />
    
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          Your can then safely store your generated
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>
            {" "}entropy grid
          </Text>
            {" "}as a PDF or seed phrase in a less secure manner, as it cannot be used to recover your funds without your memorized pattern and final word.
        </Text>
    
      </View>

      <View style={styles.buttonContainer}>
        <BlueButton buttonTextColor={colors.buttonAlternativeTextColor} title={loc.multisig.lets_start} onPress={onLetsStartPress} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  descriptionContainer: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  buttonContainer: {
    padding: 24,
  },
  textdesc: {
    fontWeight: '500',
    alignSelf: 'center',
    textAlign: 'center',
  },
  textdescBold: {
    fontWeight: '700',
    alignSelf: 'center',
    textAlign: 'center',
  },
  imageWrapper: {
    borderWidth: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 160,
  },
});

WalletsAddBorder.navigationOptions = navigationStyle({
  headerTitle: null,
});

export default WalletsAddBorder;
