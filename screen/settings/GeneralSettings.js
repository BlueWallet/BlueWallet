import React, { useEffect, useState } from 'react';
import { ScrollView, Platform, TouchableWithoutFeedback, TouchableOpacity, StyleSheet } from 'react-native';
import { BlueLoading, BlueText, BlueSpacing20, BlueListItem, SafeBlueArea, BlueNavigationStyle, BlueCard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { AppStorage } from '../../class';
import { useNavigation } from '@react-navigation/native';
import HandoffSettings from '../../class/handoff';
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdancedModeEnabled, setIsAdancedModeEnabled] = useState(false);
  const [isHandoffUseEnabled, setIsHandoffUseEnabled] = useState(false);
  const { navigate } = useNavigation();
  const onAdvancedModeSwitch = async value => {
    await BlueApp.setIsAdancedModeEnabled(value);
    setIsAdancedModeEnabled(value);
  };

  const onHandOffEnabledSwitch = async value => {
    await HandoffSettings.setHandoffUseEnabled(value);
    setIsHandoffUseEnabled(value);
  };

  useEffect(() => {
    (async () => {
      setIsAdancedModeEnabled(await BlueApp.isAdancedModeEnabled());
      setIsHandoffUseEnabled(await HandoffSettings.isHandoffUseEnabled());
      setIsLoading(false);
    })();
  });

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        {BlueApp.getWallets().length > 1 && (
          <>
            <BlueListItem component={TouchableOpacity} onPress={() => navigate('DefaultView')} title="On Launch" chevron />
          </>
        )}
        {Platform.OS === 'ios' ? (
          <>
            <BlueListItem
              hideChevron
              title={'Continuity'}
              Component={TouchableWithoutFeedback}
              switch={{ onValueChange: onHandOffEnabledSwitch, value: isHandoffUseEnabled }}
            />
            <BlueCard>
              <BlueText>
                When enabled, you will be able to view selected wallets, and transactions, using your other Apple iCloud connected devices.
              </BlueText>
            </BlueCard>
            <BlueSpacing20 />
          </>
        ) : null}
        <BlueListItem
          Component={TouchableWithoutFeedback}
          title={loc.settings.enable_advanced_mode}
          switch={{ onValueChange: onAdvancedModeSwitch, value: isAdancedModeEnabled }}
        />
        <BlueCard>
          <BlueText>
            When enabled, you will see advanced options such as different wallet types and the ability to specify the LNDHub instance you
            wish to connect to.
          </BlueText>
        </BlueCard>
        <BlueSpacing20 />
      </ScrollView>
    </SafeBlueArea>
  );
};

GeneralSettings.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'General',
});

GeneralSettings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    popToTop: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

export default GeneralSettings;
