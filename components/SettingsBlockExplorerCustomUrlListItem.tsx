import React from 'react';
import { StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import { useTheme } from './themes';
import loc from '../loc';

interface SettingsBlockExplorerCustomUrlItemProps {
  isCustomEnabled: boolean;
  onSwitchToggle: (value: boolean) => void;
  customUrl: string;
  onCustomUrlChange: (url: string) => void;
  onSubmitCustomUrl: () => void;
  inputRef?: React.RefObject<TextInput>;
}

const SettingsBlockExplorerCustomUrlItem: React.FC<SettingsBlockExplorerCustomUrlItemProps> = ({
  isCustomEnabled,
  onSwitchToggle,
  customUrl,
  onCustomUrlChange,
  onSubmitCustomUrl,
  inputRef,
}) => {
  const { colors } = useTheme();

  return (
    <View>
      <View style={[styles.container, styles.row, { backgroundColor: colors.background, borderBottomColor: colors.formBorder }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{loc.settings.block_explorer_preferred}</Text>
        </View>
        <Switch
          accessible
          accessibilityRole="switch"
          accessibilityState={{ checked: isCustomEnabled }}
          onValueChange={onSwitchToggle}
          value={isCustomEnabled}
        />
      </View>

      {isCustomEnabled && (
        <View style={[styles.uriContainer, { borderColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor }]}>
          <TextInput
            ref={inputRef}
            value={customUrl}
            placeholder={loc._.enter_url}
            onChangeText={onCustomUrlChange}
            numberOfLines={1}
            style={[styles.uriText, { color: colors.text }]}
            placeholderTextColor={colors.placeholderTextColor}
            textContentType="URL"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
            onSubmitEditing={onSubmitCustomUrl}
            editable={isCustomEnabled}
          />
        </View>
      )}
    </View>
  );
};

export default SettingsBlockExplorerCustomUrlItem;

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  uriContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 4,
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  uriText: {
    flex: 1,
    minHeight: 36,
  },
});
