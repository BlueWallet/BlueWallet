import React, { Component } from 'react';
import { StyleSheet, TextInput as BaseTextInput, View, Text, Animated, TextInputProps } from 'react-native';

import { defaultKeyboardType } from 'app/consts';
import { palette, typography, fonts } from 'app/styles';

interface Props extends TextInputProps {
  label?: string;
  suffix?: string;
  error?: string | boolean;
  value?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
  setValue?: (value: string) => void;
  focused?: boolean;
  onBlur?: () => void;
}

interface State {
  isActive: boolean;
  isAnimatedFocused: Animated.Value;
  value: string;
  height: number;
}

export class InputItem extends Component<Props, State> {
  inputItemRef = React.createRef<BaseTextInput>();

  constructor(props: Props) {
    super(props);
    this.state = {
      isActive: false,
      isAnimatedFocused: new Animated.Value(props.focused ? 1 : 0),
      value: this.props.value || '',
      height: 0,
    };
  }

  shouldComponentUpdate(nextProps: Props) {
    return this.props.value !== nextProps.value;
  }

  onFocus = () => {
    const { onFocus } = this.props;
    if (onFocus) {
      return onFocus();
    }
    this.animateFocus();
  };

  animateFocus = () => {
    this.setState({
      isActive: true,
    });
    Animated.timing(this.state.isAnimatedFocused, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  onBlur = () => {
    this.setState({
      isActive: false,
    });
    const { onBlur } = this.props;
    if (!this.state.value) {
      Animated.timing(this.state.isAnimatedFocused, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    !!onBlur && onBlur();
  };

  componentDidUpdate() {
    if (this.props.value) {
      this.animateFocus();
    }
    if (!this.props.value && this.props.editable === false) {
      this.setState({
        isActive: false,
      });
      Animated.timing(this.state.isAnimatedFocused, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }

  componentDidMount() {
    if (!!this.props.value) {
      this.animateFocus();
    }
  }

  onChangeText = (text: string) => {
    this.setState({ value: text });
    if (this.props.setValue) {
      this.props.setValue(text);
    }
  };

  focus = () => {
    this.inputItemRef.current?.focus();
  };

  render() {
    const { isAnimatedFocused, isActive, height } = this.state;
    const { label, suffix, error, secureTextEntry } = this.props;
    const keyboardType = secureTextEntry ? 'default' : defaultKeyboardType;

    const top = this.state.isAnimatedFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -8],
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
          ref={this.inputItemRef}
          autoCorrect={false}
          keyboardType={keyboardType}
          testID={this.props.testID}
          {...this.props}
          style={[
            styles.input,
            !!suffix && styles.isSuffix,
            isActive && styles.isActiveInput,
            !!error && styles.isError,
            { height: Math.max(40, height) },
            this.props.style,
          ]}
          selectionColor={palette.textSecondary}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onChangeText={this.onChangeText}
          onContentSizeChange={event => {
            this.setState({ height: event.nativeEvent.contentSize.height });
          }}
        />
        {!!error && (
          <Text testID="validation-error-message" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  label: {
    position: 'absolute',
    left: 0,
    color: palette.textGrey,
    fontFamily: fonts.ubuntu.light,
  },
  input: {
    marginTop: 6,
    color: palette.textBlack,
    paddingRight: 50,
    minHeight: 27,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    paddingTop: 6,
    paddingBottom: 6,
    ...typography.caption,
  },
  isSuffix: {
    paddingRight: 80,
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
    top: 18,
    ...typography.caption,
    lineHeight: 19,
  },
  error: {
    marginTop: 3,
    ...typography.subtitle2,
    color: palette.error,
  },
});
