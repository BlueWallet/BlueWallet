import React, { Component } from 'react';
import { StyleSheet, TextInput as BaseTextInput, View, Text, Animated, KeyboardType } from 'react-native';

import { palette, typography, fonts } from 'app/styles';

interface Props {
  label: string;
  suffix?: string;
  error?: string;
  value?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
  setValue?: (value: string) => void;
  focused?: boolean;
  keyboardType?: KeyboardType;
}

interface State {
  isActive: boolean;
  isAnimatedFocused: Animated.Value;
  value: string;
}

export class InputItem extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isActive: false,
      isAnimatedFocused: new Animated.Value(props.focused ? 1 : 0),
      value: this.props.value || '',
    };
  }

  onFocus = () => {
    const { onFocus } = this.props;
    if (onFocus) {
      return onFocus();
    }
    this.setState({
      isActive: true,
    });
    // @ts-ignore
    Animated.timing(this.state.isAnimatedFocused, {
      toValue: 1,
      duration: 200,
    }).start();
  };

  onBlur = () => {
    this.setState({
      isActive: false,
    });
    if (!this.state.value) {
      // @ts-ignore
      Animated.timing(this.state.isAnimatedFocused, {
        toValue: 0,
        duration: 200,
      }).start();
    }
  };

  onChangeText = (text: string) => {
    this.setState({ value: text });
    if (this.props.setValue) {
      this.props.setValue(text);
    }
  };

  render() {
    const { isAnimatedFocused, isActive } = this.state;
    const { label, suffix, error } = this.props;
    const top = this.state.isAnimatedFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [12, -8],
    });
    const fontSize = isAnimatedFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    });
    return (
      <View style={styles.container}>
        <Animated.Text style={[styles.label, { top, fontSize }]}>{label}</Animated.Text>
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        <BaseTextInput
          {...this.props}
          style={[
            styles.input,
            !!suffix && styles.isSuffix,
            isActive && styles.isActiveInput,
            !!error && styles.isError,
          ]}
          selectionColor={palette.textSecondary}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onChangeText={this.onChangeText}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: 70,
  },
  label: {
    position: 'absolute',
    left: 0,
    color: palette.textGrey,
    fontFamily: fonts.ubuntu.light,
  },
  input: {
    paddingRight: 50,
    height: 43,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    ...typography.caption,
  },
  isSuffix: {
    paddingRight: 50,
  },
  isError: {
    borderBottomColor: palette.error,
  },
  isActiveInput: {
    borderBottomColor: palette.textSecondary,
  },
  suffix: {
    position: 'absolute',
    right: 0,
    top: 12,
    ...typography.caption,
    lineHeight: 19,
  },
  error: {
    marginTop: 3,
    ...typography.subtitle2,
    color: palette.error,
  },
});
