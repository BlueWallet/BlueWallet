import React, { useState } from 'react';
import { FlatList, Alert, StyleSheet } from 'react-native';
import ListItem from '../../components/ListItem';
import SettingsBlockExplorerCustomUrlListItem from '../../components/SettingsBlockExplorerCustomUrlListItem';
import loc from '../../loc';
import { BLOCK_EXPLORERS } from '../../models/blockExplorer';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';

const SettingsBlockExplorer: React.FC = () => {
  const { selectedBlockExplorer, setBlockExplorerStorage } = useSettings();
  const [customUrlInput, setCustomUrlInput] = useState<string>(selectedBlockExplorer || '');
  const { colors } = useTheme();

  const blockExplorers = [
    { name: `${loc._.default} - Mempool.space`, key: 'default', url: BLOCK_EXPLORERS.DEFAULT },
    { name: 'Blockchair', key: 'blockchair', url: BLOCK_EXPLORERS.BLOCKCHAIR },
    { name: 'Blockstream.info', key: 'blockstream', url: BLOCK_EXPLORERS.BLOCKSTREAM },
    { name: loc.settings.block_explorer_custom, key: 'custom', url: null },
  ];

  const handleExplorerPress = async (key: string, url: string | null) => {
    if (key === 'custom') {
      setCustomUrlInput(selectedBlockExplorer);
      return;
    }

    const success = await setBlockExplorerStorage(url!);
    if (!success) {
      Alert.alert(loc.errors.error, loc.settings.block_explorer_error_saving_custom);
    }
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrlInput(url);
  };

  const handleSubmitCustomUrl = async () => {
    if (!customUrlInput) return;
    const success = await setBlockExplorerStorage(customUrlInput);
    if (!success) {
      Alert.alert(loc.errors.error, loc.settings.block_explorer_error_saving_custom);
    }
  };

  const renderItem = ({ item }: { item: { name: string; key: string; url: string | null } }) => {
    if (item.key === 'custom') {
      return (
        <SettingsBlockExplorerCustomUrlListItem
          title={item.name}
          selected={selectedBlockExplorer === customUrlInput}
          customUrl={customUrlInput}
          onCustomUrlChange={handleCustomUrlChange}
          onSubmitCustomUrl={handleSubmitCustomUrl}
          onPress={() => handleExplorerPress(item.key, item.url)}
          checkmark={selectedBlockExplorer === customUrlInput}
        />
      );
    }

    return (
      <ListItem
        title={item.name}
        onPress={() => handleExplorerPress(item.key, item.url)}
        checkmark={selectedBlockExplorer === item.url}
        disabled={selectedBlockExplorer === item.url}
        containerStyle={{ backgroundColor: colors.background }}
      />
    );
  };

  return (
    <FlatList
      data={blockExplorers}
      keyExtractor={item => item.key}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      style={[styles.container, { backgroundColor: colors.background }]}
    />
  );
};

export default SettingsBlockExplorer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
