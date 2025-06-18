import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'GeneralSettings'>;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings: React.FC = () => {
  const { wallets } = useStorage();
  const { isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage, isLegacyURv1Enabled, setIsLegacyURv1EnabledStorage } = useSettings();
  const { navigate } = useNavigation<NavigationProp>();
  const { colors } = useTheme();

  const navigateToPrivacy = () => {
    navigate('SettingsPrivacy');
  };

  const onHandOffUseEnabledChange = async (value: boolean) => {
    await setIsHandOffUseEnabledAsyncStorage(value);
  };

  const stylesWithThemeHook = {
    root: {
      backgroundColor: colors.background,
    },
  };

  return (
    <SafeAreaScrollView
      style={[styles.root, stylesWithThemeHook.root]}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {wallets.length > 0 && (
        <>
          <ListItem onPress={() => navigate('DefaultView')} title={loc.settings.default_title} chevron />
        </>
      )}
      <ListItem title={loc.settings.privacy} onPress={navigateToPrivacy} testID="SettingsPrivacy" chevron />
      {Platform.OS === 'ios' ? (
        <>
          <ListItem
            title={loc.settings.general_continuity}
            Component={PressableWrapper}
            switch={{ onValueChange: onHandOffUseEnabledChange, value: isHandOffUseEnabled }}
            subtitle={loc.settings.general_continuity_e}
          />
        </>
      ) : null}
      <ListItem
        Component={PressableWrapper}
        title="Legacy URv1 QR"
        switch={{ onValueChange: setIsLegacyURv1EnabledStorage, value: isLegacyURv1Enabled }}
      />
      <BlueSpacing20 />
    </SafeAreaScrollView>
  );
};

export default GeneralSettings;
