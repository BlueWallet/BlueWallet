import React from 'react';
import ListItem from '../../components/ListItem';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation.ts';

const ToolsScreen = () => {
  const { navigate } = useExtendedNavigation();

  const navigateToIsItMyAddress = () => {
    navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigate('GenerateWord');
  };

  return (
    <SafeAreaScrollView>
      <ListItem title={loc.is_it_my_address.title} onPress={navigateToIsItMyAddress} testID="IsItMyAddress" chevron />
      <ListItem title={loc.settings.network_broadcast} onPress={navigateToBroadcast} testID="Broadcast" chevron />
      <ListItem title={loc.autofill_word.title} onPress={navigateToGenerateWord} testID="GenerateWord" chevron />
    </SafeAreaScrollView>
  );
};

export default ToolsScreen;
