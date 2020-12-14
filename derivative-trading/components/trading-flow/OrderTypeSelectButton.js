import { useTheme } from '@react-navigation/native';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';

const OrderTypeSelectButton = ({ title, onPress, buttonStyle, containerStyle }) => {
  const { colors } = useTheme();

  return (
    <Button
      icon={{
        name: 'chevron-down',
        type: 'feather',
        color: colors.brandingColor,
      }}
      raised
      iconRight
      onPress={onPress}
      titleStyle={{ color: colors.brandingColor }}
      title={title}
      color={colors.buttonTextColor}
      buttonStyle={buttonStyle}
      containerStyle={containerStyle}
      ViewComponent={LinearGradient}
      linearGradientProps={{
        colors: ['#FC0441', '#F62DA8'],
        start: { x: 0, y: 0.0 },
        end: { x: 1.0, y: 1.0 },
      }}
    />
  );
};

OrderTypeSelectButton.propTypes = {
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  buttonStyle: PropTypes.object.isRequired,
  containerStyle: PropTypes.object.isRequired,
};

export default OrderTypeSelectButton;
