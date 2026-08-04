import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from './themes';
import loc from '../loc';
import { SettingsListItem } from './SettingsSection';

interface SettingsBlockExplorerCustomUrlItemProps {
  isCustomEnabled: boolean;
  onSwitchToggle: (value: boolean) => void;
  customUrl: string;
  onCustomUrlChange: (url: string) => void;
  onSubmitCustomUrl: () => void;
  inputRef?: React.RefObject<TextInput | null>;
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
      <SettingsListItem
        title={loc.settings.block_explorer_preferred}
        switch={{
          value: isCustomEnabled,
          onValueChange: onSwitchToggle,
        }}
        bottomDivider={false}
      />

      {isCustomEnabled && (
        <View style={styles.inputWrapper}>
          <View style={[styles.uriContainer, { borderColor: colors.formBorder, backgroundColor: colors.inputBackgroundColor }]}>
            <TextInput
              ref={inputRef}
              value={customUrl}
              placeholder={loc._.enter_url}
              onChangeText={onCustomUrlChange}
              numberOfLines={1}
              style={[styles.uriText, { color: colors.foregroundColor }]}
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
        </View>
      )}
    </View>
  );
};

export default SettingsBlockExplorerCustomUrlItem;

const styles = StyleSheet.create({
  inputWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  uriContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  uriText: {
    flex: 1,
    minHeight: 36,
  },
});
