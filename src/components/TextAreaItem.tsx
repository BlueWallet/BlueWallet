import React, { PureComponent } from 'react';
import { StyleSheet, TextInput as BaseTextInput, StyleProp, ViewStyle, Text } from 'react-native';

import { palette, typography } from 'app/styles';

interface Props {
  style?: StyleProp<ViewStyle>;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  error?: string;
}

interface State {
  isActive: boolean;
}
export class TextAreaItem extends PureComponent<Props, State> {
  state = {
    isActive: false,
  };
  onFocus = () => this.setState({ isActive: true });

  onBlur = () => this.setState({ isActive: false });

  render() {
    const { style, placeholder, onChangeText, error } = this.props;
    const { isActive } = this.state;
    return (
      <>
        <BaseTextInput
          style={[styles.input, isActive && styles.inputActive, style, !!error && styles.isError]}
          placeholder={placeholder}
          placeholderTextColor={palette.textGrey}
          numberOfLines={100}
          selectionColor={palette.textSecondary}
          multiline={true}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onChangeText={onChangeText}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </>
    );
  }
}

const styles = StyleSheet.create({
  input: {
    ...typography.caption,
    height: 100,
    padding: 16,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
  },
  inputActive: {
    borderColor: palette.textSecondary,
  },
  isError: {
    borderColor: palette.error,
  },
  error: {
    marginTop: 3,
    ...typography.subtitle2,
    color: palette.error,
  },
});
