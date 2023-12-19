import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from './themes';

export const StyledButtonType = { default: 'default', destroy: 'destroy', grey: 'grey' };
const StyledButton = props => {
  const { onPress, text = '', disabled = false, buttonStyle = StyledButtonType.default } = props;
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    buttonGrey: {
      backgroundColor: colors.lightButton,
    },
    textGray: {
      color: colors.buttonTextColor,
    },
  });
  const textStyles = () => {
    if (buttonStyle === StyledButtonType.grey) {
      return stylesHook.textGray;
    } else if (buttonStyle === StyledButtonType.destroy) {
      return styles.textDestroy;
    } else {
      return styles.textDefault;
    }
  };

  const buttonStyles = () => {
    if (buttonStyle === StyledButtonType.grey) {
      return stylesHook.buttonGrey;
    } else if (buttonStyle === StyledButtonType.destroy) {
      return styles.buttonDestroy;
    } else {
      return styles.buttonDefault;
    }
  };

  const opacity = { opacity: disabled ? 0.5 : 1.0 };

  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={opacity}>
      <View style={[styles.buttonContainer, buttonStyles()]}>
        <Text style={[styles.text, textStyles()]}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 4,
  },
  buttonDefault: {
    backgroundColor: '#EBF2FB',
  },
  buttonDestroy: {
    backgroundColor: '#FFF5F5',
  },
  text: {
    fontWeight: '600',
    fontSize: 15,
  },
  textDefault: {
    color: '#1961B9',
  },
  textDestroy: {
    color: '#D0021B',
  },
});

export default StyledButton;
StyledButton.propTypes = {
  onPress: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  buttonStyle: PropTypes.string,
};
