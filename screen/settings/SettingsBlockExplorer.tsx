import React, { useState, useRef } from 'react';
import { FlatList, Alert, StyleSheet, TextInput } from 'react-native';
import ListItem from '../../components/ListItem';
import SettingsBlockExplorerCustomUrlListItem from '../../components/SettingsBlockExplorerCustomUrlListItem';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { blockExplorers } from '../../models/blockExplorer';

const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

const isValidUrl = (url: string) => {
  const urlPattern = /^(https?:\/\/)/;
  return urlPattern.test(url);
};

const SettingsBlockExplorer: React.FC = () => {
  const { selectedBlockExplorer, setBlockExplorerStorage } = useSettings();
  const [customUrlInput, setCustomUrlInput] = useState<string>(selectedBlockExplorer || '');
  const [prevSelectedBlockExplorer, setPrevSelectedBlockExplorer] = useState<string>(selectedBlockExplorer); // Use prevSelectedBlockExplorer
  const [isCustomSelected, setIsCustomSelected] = useState<boolean>(false);
  const customUrlInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();

  const isSelectedExplorer = (url: string | null) => {
    if (!url && selectedBlockExplorer === customUrlInput) return true;
    return normalizeUrl(selectedBlockExplorer) === normalizeUrl(url || '');
  };

  const handleExplorerPress = async (key: string, url: string | null) => {
    if (key === 'custom') {
      setIsCustomSelected(true);
      setPrevSelectedBlockExplorer(selectedBlockExplorer); // Store previous selection
      return;
    }
    setCustomUrlInput('');
    setIsCustomSelected(false);
    const success = await setBlockExplorerStorage(url!);
    if (!success) {
      Alert.alert(loc.errors.error, loc.settings.block_explorer_error_saving_custom);
    }
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrlInput(url);
  };

  const handleSubmitCustomUrl = async () => {
    if (!customUrlInput || !isValidUrl(customUrlInput)) {
      Alert.alert(loc.errors.error, loc.settings.block_explorer_invalid_custom_url);
      customUrlInputRef.current?.focus();
      await setBlockExplorerStorage(prevSelectedBlockExplorer); // Revert to previous block explorer
      return;
    }
    const success = await setBlockExplorerStorage(customUrlInput);
    if (!success) {
      Alert.alert(loc.errors.error, loc.settings.block_explorer_error_saving_custom);
    }
  };

  const handleCustomUrlBlur = async () => {
    if (isValidUrl(customUrlInput)) {
      setIsCustomSelected(false);
    } else {
      await handleSubmitCustomUrl(); // Revert to previous block explorer if invalid
    }
  };

  const handleCustomUrlFocus = () => {
    setIsCustomSelected(true);
  };

  const renderItem = ({ item }: { item: { name: string; key: string; url: string | null } }) => {
    if (item.key === 'custom') {
      return (
        <SettingsBlockExplorerCustomUrlListItem
          title={item.name}
          selected={isCustomSelected}
          customUrl={customUrlInput}
          onCustomUrlChange={handleCustomUrlChange}
          onSubmitCustomUrl={handleSubmitCustomUrl}
          onPress={() => handleExplorerPress(item.key, item.url)}
          onFocus={handleCustomUrlFocus}
          onBlur={handleCustomUrlBlur}
          inputRef={customUrlInputRef}
          checkmark={isSelectedExplorer(null)}
        />
      );
    }

    return (
      <ListItem
        title={item.name}
        onPress={() => handleExplorerPress(item.key, item.url)}
        checkmark={isSelectedExplorer(item.url)}
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
