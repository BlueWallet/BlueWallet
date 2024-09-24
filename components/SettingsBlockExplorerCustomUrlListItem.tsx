import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { ListItem as RNElementsListItem } from '@rneui/themed';
import { useTheme } from './themes';
import loc from '../loc';

interface SettingsBlockExplorerCustomUrlListItemProps {
  title: string;
  customUrl?: string;
  onCustomUrlChange?: (url: string) => void;
  onSubmitCustomUrl?: () => void;
  selected: boolean;
  onPress: () => void;
  checkmark?: boolean;
  isLoading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<TextInput>;
}

const SettingsBlockExplorerCustomUrlListItem: React.FC<SettingsBlockExplorerCustomUrlListItemProps> = ({
  title,
  customUrl,
  onCustomUrlChange,
  onSubmitCustomUrl,
  selected,
  onPress,
  checkmark = false,
  isLoading = false,
  onFocus,
  onBlur,
  inputRef,
}) => {
  const { colors } = useTheme();
  const styleHook = StyleSheet.create({
    uri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    containerStyle: {
      backgroundColor: colors.background,
      minHeight: selected ? 140 : 60,
    },
    checkmarkContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmarkStyle: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  });

  return (
    <TouchableOpacity onPress={onPress}>
      <RNElementsListItem containerStyle={styleHook.containerStyle} bottomDivider>
        <RNElementsListItem.Content>
          <RNElementsListItem.Title style={[styles.title, { color: colors.text }]}>{title}</RNElementsListItem.Title>
        </RNElementsListItem.Content>
        {checkmark && (
          <View style={styleHook.checkmarkContainer}>
            <RNElementsListItem.CheckBox
              iconRight
              iconType="octaicon"
              checkedIcon="check"
              checked
              containerStyle={styleHook.checkmarkStyle}
            />
          </View>
        )}
      </RNElementsListItem>

      {selected && (
        <View style={[styles.uri, styleHook.uri]}>
          <TextInput
            ref={inputRef}
            value={customUrl}
            placeholder={loc._.enter_url}
            onChangeText={onCustomUrlChange}
            numberOfLines={1}
            style={styles.uriText}
            placeholderTextColor="#81868e"
            editable={!isLoading}
            textContentType="URL"
            autoFocus
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
            onSubmitEditing={onSubmitCustomUrl}
            onFocus={onFocus}
            onBlur={onBlur}
            testID="CustomURIInput"
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  uri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  uriText: {
    flex: 1,
    color: '#81868e',
    marginHorizontal: 8,
    minHeight: 36,
    height: 36,
  },
});

export default SettingsBlockExplorerCustomUrlListItem;
