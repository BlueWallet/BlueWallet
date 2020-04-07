import React from 'react';
import { Text } from 'react-native';
import { typography } from 'styles';

interface Props {
  title: string;
}

export const HeaderTitle = (props: Props) => <Text style={typography.headline4}>{props.title}</Text>;
