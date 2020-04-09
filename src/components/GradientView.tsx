import { LinearGradient } from './Gradient';
import React, { PureComponent, ReactChild } from 'react';
import { ViewStyle } from 'react-native';

import { gradients } from 'styles';

enum GradientVariant {
  Primary = 'Primary',
  Secondary = 'Secondary',
}
interface Props {
  children?: ReactChild;
  variant: GradientVariant;
  style?: ViewStyle;
}

export class GradientView extends PureComponent<Props> {
  static Variant = GradientVariant;
  render() {
    const { variant, style, children } = this.props;
    return (
      <LinearGradient {...gradients[variant]} style={style} {...this.props}>
        {children}
      </LinearGradient>
    );
  }
}
