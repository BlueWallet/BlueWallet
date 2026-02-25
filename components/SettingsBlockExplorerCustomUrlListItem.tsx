import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from './themes';
import loc from '../loc';
import { SettingsCard, SettingsListItem, isAndroid } from './platform';

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
  const horizontalPadding = isAndroid ? 20 : 16;

  return (
    <View>
      <SettingsListItem
        title={loc.settings.block_explorer_preferred}
        switch={{
          value: isCustomEnabled,
          onValueChange: onSwitchToggle,
        }}
        position="single"
        spacingTop
      />

      {isCustomEnabled && (
        <View style={[styles.inputCardWrapper, { paddingHorizontal: horizontalPadding }]}>
          <SettingsCard compact>
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
          </SettingsCard>
        </View>
      )}
    </View>
  );
};

export default SettingsBlockExplorerCustomUrlItem;

const styles = StyleSheet.create({
  inputCardWrapper: {
    marginTop: isAndroid ? 12 : 10,
  },
  uriContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: isAndroid ? 4 : 8,
    marginVertical: isAndroid ? 12 : 10,
    marginHorizontal: isAndroid ? 12 : 10,
    paddingHorizontal: isAndroid ? 10 : 12,
    alignItems: 'center',
    minHeight: 44,
  },
  uriText: {
    flex: 1,
    minHeight: 36,
  },
});
