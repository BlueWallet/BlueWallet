import React from 'react';
import { Switch } from 'react-native';
import { palette } from 'styles';

interface Props {
  onValueChange?: (value: boolean) => void;
  value?: boolean;
}

const trackColor = {
  false: palette.border,
  true: palette.secondary,
};

export const StyledSwitch = ({ onValueChange, value }: Props) => (
  <Switch
    thumbColor={palette.background}
    ios_backgroundColor={palette.secondary}
    trackColor={trackColor}
    value={value}
    onValueChange={onValueChange}
  />
);
