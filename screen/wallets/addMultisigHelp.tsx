import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../components/themes';
import loc from '../../loc';

const WalletsAddMultisigHelp: React.FC = () => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    intro: {
      backgroundColor: colors.newBlue,
      borderBottomColor: colors.inputBorderColor,
    },
    introTitle: {
      color: colors.inverseForegroundColor,
    },
    introText: {
      color: colors.inverseForegroundColor,
    },
    tipsTitle: {
      color: colors.foregroundColor,
    },
    tipsText: {
      color: colors.alternativeTextColor,
    },
  });

  return (
    <ScrollView
      contentContainerStyle={stylesHook.root}
      style={stylesHook.root}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    >
      <View style={[styles.intro, stylesHook.intro]}>
        <Text style={[styles.introTitle, stylesHook.introTitle]}>{loc.multisig.ms_help_title}</Text>
        <Text style={[styles.introText, stylesHook.introText]}>{loc.multisig.ms_help_text}</Text>
        <Image style={styles.introImage} source={require('../../img/mshelp/mshelp-intro.png')} />
      </View>
      <View style={styles.tips}>
        <Text style={[styles.tipsTitle, stylesHook.tipsTitle]}>{loc.multisig.ms_help_title1}</Text>
        <Text style={[styles.tipsText, stylesHook.tipsText]}>{loc.multisig.ms_help_1}</Text>
      </View>
      <View style={styles.tips}>
        <Image style={styles.imageTip} source={require('../../img/mshelp/tip2.png')} />
        <Text style={[styles.tipsTitle, stylesHook.tipsTitle]}>{loc.multisig.ms_help_title2}</Text>
        <Text style={[styles.tipsText, stylesHook.tipsText]}>{loc.multisig.ms_help_2}</Text>
      </View>
      <View style={styles.tips}>
        <Image style={styles.imageTip} source={require('../../img/mshelp/tip3.png')} />
        <Text style={[styles.tipsTitle, stylesHook.tipsTitle]}>{loc.multisig.ms_help_title3}</Text>
        <Text style={[styles.tipsText, stylesHook.tipsText]}>{loc.multisig.ms_help_3}</Text>
      </View>
      <View style={styles.tips}>
        <Image style={styles.imageTip} source={require('../../img/mshelp/tip4.png')} />
        <Text style={[styles.tipsTitle, stylesHook.tipsTitle]}>{loc.multisig.ms_help_title4}</Text>
        <Text style={[styles.tipsText, stylesHook.tipsText]}>{loc.multisig.ms_help_4}</Text>
      </View>
      <View style={styles.tips}>
        <Image style={styles.imageTip} source={require('../../img/mshelp/tip5.png')} />
        <Text style={[styles.tipsTitle, stylesHook.tipsTitle]}>{loc.multisig.ms_help_title5}</Text>
        <Text style={[styles.tipsText, stylesHook.tipsText]}>{loc.multisig.ms_help_5}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: 32,
    borderBottomWidth: 1,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 24,
  },
  introText: {
    fontSize: 15,
    marginVertical: 24,
  },
  introImage: {
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'flex-end',
  },
  tips: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  tipsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  tipsText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
  },
  imageTip: {
    marginBottom: 24,
    width: '100%',
    maxWidth: 390,
  },
});

export default WalletsAddMultisigHelp;
