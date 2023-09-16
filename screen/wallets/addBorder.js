import React, { useState, useRef, useEffect, useContext } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { Icon } from 'react-native-elements';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueButton, BlueListItem, BlueSpacing20 } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import BottomModal from '../../components/BottomModal';
import { MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const WalletsAddBorder = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const loadingAnimation = useRef();
  const { walletLabel = loc.multisig.default_label, seedPhrase } = useRoute().params;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
      flex: 1,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    textSubtitle: {
      color: colors.alternativeTextColor,
    },
    selectedItem: {
      backgroundColor: colors.elevated,
    },
    deSelectedItem: {
      backgroundColor: 'transparent',
    },
    textHeader: {
      color: colors.outputValue,
    },
  });

  useEffect(() => {
    if (loadingAnimation.current) {
      /*
      https://github.com/lottie-react-native/lottie-react-native/issues/832#issuecomment-1008209732
      Temporary workaround until Lottie is fixed.
      */
      setTimeout(() => {
        loadingAnimation.current?.reset();
        loadingAnimation.current?.play();
      }, 100);
    }
  }, []);

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
  item: {
    paddingHorizontal: 0,
  },
  descriptionContainer: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  modalContentShort: {
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 350,
  },
  borderRadius6: {
    borderRadius: 6,
  },
  buttonContainer: {
    padding: 24,
  },
  column: {
    paddingRight: 20,
    paddingLeft: 20,
  },
  chevron: {
    paddingBottom: 10,
    paddingTop: 10,
    fontSize: 24,
  },
  columnOf: {
    paddingRight: 20,
    paddingLeft: 20,
    justifyContent: 'center',
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
  textM: {
    fontSize: 50,
    fontWeight: '700',
  },
  textOf: {
    fontSize: 30,
    color: '#9AA0AA',
  },
  textHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  imageWrapper: {
    borderWidth: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 160,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

WalletsAddBorder.navigationOptions = navigationStyle({
  headerTitle: null,
});

export default WalletsAddBorder;
