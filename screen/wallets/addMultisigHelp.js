import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle, BlueSpacing20, BlueLoading } from '../../BlueComponents';
/** @type {AppStorage} */
import loc from '../../loc';

const WalletsAddMultisigHelp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    intro: {
      backgroundColor: colors.newBlue,
    },
    introTitle:{
      color: colors.inverseForegroundColor,
    },
    introText:{
      color: colors.inverseForegroundColor,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <View style={[styles.intro, stylesHook.intro]}>
          <Text style={[styles.introTitle, stylesHook.introTitle]}>
            {loc.multisig.ms_help_title}
          </Text>
          <Text style={[styles.introText, stylesHook.introText]}>
            {loc.multisig.ms_help_text}
          </Text>
        </View>
        <View style={[styles.tip, stylesHook.tip]}>
          <Text style={[styles.introTip, stylesHook.introTip]}></Text>
        </View>

      </ScrollView>
    </SafeBlueArea>
  );
};

 const styles = StyleSheet.create({
    root: {
      flex: 1,
    },
  });

WalletsAddMultisigHelp.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: '',
  headerStyle: {
      backgroundColor: '#000000',
    },
});

export default WalletsAddMultisigHelp;
