import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as ElementsButton, ButtonProps } from 'react-native-elements';
import { palette, typography } from 'styles';
import { LinearGradient } from './Gradient';
import { Image, FastImageSource } from './Image';

interface Props extends ButtonProps {
  source?: FastImageSource;
}

export const Button = (props: Props) => {
  const { type, source } = props;
  const commonProps: Props = {
    containerStyle: styles.containerStyle,
    buttonStyle: styles.buttonStyle,
    titleStyle: [typography.button, styles.titleStyle],
    disabledStyle: styles.disabledStyle,
    disabledTitleStyle: styles.disabledTitleStyle,
    iconRight: true,
    icon: source && <Image source={source} style={styles.image} />,
  };

  const outlineProps: Props = {
    titleStyle: [commonProps.titleStyle, styles.outlineTitle],
    buttonStyle: [commonProps.buttonStyle, styles.outlineButtonStyle],
    disabledTitleStyle: styles.outlineDisabledTitleStyle,
  };

  const solidProps: Props = {
    ViewComponent: LinearGradient,
    linearGradientProps: {
      colors: [palette.gradientSecondaryFirst, palette.gradientSecondarySecond],
    },
  };

  const renderProps = () => {
    switch (type) {
      case 'outline':
        return outlineProps;
      default:
        return solidProps;
    }
  };

  return <ElementsButton {...commonProps} {...renderProps()} {...(props as ButtonProps)} />;
};

const styles = StyleSheet.create({
  containerStyle: {
    width: '100%',
  },
  buttonStyle: {
    borderRadius: 32.5,
    height: 43,
  },
  titleStyle: {
    ...typography.button,
    color: palette.white,
  },
  disabledStyle: {
    opacity: 0.54,
  },
  disabledTitleStyle: {
    color: palette.white,
  },
  outlineTitle: {
    color: palette.secondary,
  },
  outlineButtonStyle: {
    borderWidth: 1.5,
    borderColor: palette.secondary,
  },
  outlineDisabledTitleStyle: {
    color: palette.border,
  },
  image: {
    width: 18,
    height: 18,
    right: 25,
    position: 'absolute',
  },
});
