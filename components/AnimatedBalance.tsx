import React, { useMemo } from 'react';
import { Platform, StyleSheet, StyleProp, TextStyle } from 'react-native';
import NumberFlow from 'rn-number-flow';

type AnimatedBalanceVariant = 'prominent' | 'subtle';

interface AnimatedBalanceProps {
  formattedValue: string;
  textStyle?: StyleProp<TextStyle>;
  separatorStyle?: StyleProp<TextStyle>;
  variant?: AnimatedBalanceVariant;
  autoFitText?: boolean;
}

const prominentAnimationConfig = {
  enabled: true,
  animateOnMount: false,
  digitDelay: 40,
  mass: 0.9,
  stiffness: 80,
  damping: 18,
};

const subtleAnimationConfig = {
  enabled: true,
  animateOnMount: false,
  digitDelay: 10,
  mass: 0.9,
  stiffness: 80,
  damping: 20,
};

const AnimatedBalance: React.FC<AnimatedBalanceProps> = ({
  formattedValue,
  textStyle,
  separatorStyle,
  variant = 'prominent',
  autoFitText,
}) => {
  const animationConfig = useMemo(() => {
    return variant === 'subtle' ? subtleAnimationConfig : prominentAnimationConfig;
  }, [variant]);

  const normalizedValue = useMemo(() => formattedValue.replace(/\u00A0/g, ' '), [formattedValue]);

  const resolvedTextStyle = useMemo(() => StyleSheet.flatten([styles.text, textStyle]) as TextStyle, [textStyle]);
  const resolvedSeparatorStyle = useMemo(
    () => StyleSheet.flatten([styles.text, separatorStyle ?? textStyle]) as TextStyle,
    [separatorStyle, textStyle],
  );

  return (
    <NumberFlow
      value={normalizedValue}
      style={resolvedTextStyle}
      separatorStyle={resolvedSeparatorStyle}
      animationConfig={animationConfig}
      autoFitText={autoFitText}
    />
  );
};

const styles = StyleSheet.create({
  text: {
    ...Platform.select({
      ios: { fontFamily: 'SF Pro Rounded', fontWeight: 'bold' as const },
    }),
  },
});

export default React.memo(AnimatedBalance);
