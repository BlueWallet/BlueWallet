import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlueButton, BlueSpacing20 } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
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
    },
  });

  const onLetsStartPress = () => {
    navigate('WalletsAddBorderSaveGrid', { walletLabel, seedPhrase });
  };

  return (
    <SafeAreaView style={stylesHook.root}>
      <View style={styles.descriptionContainer}>
        <View style={styles.imageWrapper}>
          <Image style={styles.imageStyle} source={require('../../img/addWallet/border.png')} />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.border.what_part_1}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{loc.border.what_part_2}</Text>
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.border.instructions_part_1}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{loc.border.instructions_part_2}</Text>
          {loc.border.instructions_part_3}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{loc.border.instructions_part_4}</Text>
          {loc.border.instructions_part_5}
        </Text>

        <BlueSpacing20 />

        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.border.then_part_1}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{loc.border.then_part_2}</Text>
          {loc.border.then_part_3}
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
  imageStyle: {
    width: 102,
    height: 102,
  },
});

WalletsAddBorder.navigationOptions = navigationStyle({
  headerTitle: null,
});

export default WalletsAddBorder;
