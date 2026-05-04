import React, { memo, useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  type TextStyle,
  type TextLayoutLine,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import Reanimated, { LinearTransition, ReduceMotion, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';

interface AnimationConfig {
  enabled?: boolean;
  animateOnMount?: boolean;
  digitDelay?: number;
  mass?: number;
  stiffness?: number;
  damping?: number;
  reduceMotion?: ReduceMotion;
}

interface NumberFlowProps {
  value: string;
  style?: TextStyle;
  separatorStyle?: TextStyle;
  animationConfig?: AnimationConfig;
  autoFitText?: boolean;
  /**
   * Whether to force tabular (monospaced) digits via fontVariant: ['tabular-nums'].
   * Defaults to true to preserve upstream behaviour.
   */
  useTabularNumbers?: boolean;
  testID?: string;
}

const DIGITS = [...Array(10).keys()];

const Character = memo(({ children, style, useTabularNumbers, ...rest }: ComponentProps<typeof Text> & { useTabularNumbers?: boolean }) => {
  const charStyle = typeof style === 'object' ? style : {};

  return (
    <Text
      style={[
        charStyle,
        useTabularNumbers && {
          fontVariant: ['tabular-nums'],
        },
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
});

const CharacterList = memo(
  ({
    number,
    index,
    style,
    animationConfig,
    initialRender,
    useTabularNumbers,
  }: {
    number: number;
    index: number;
    style?: TextStyle;
    animationConfig: Required<Omit<AnimationConfig, 'digitDelay' | 'animateOnMount'>>;
    initialRender: boolean;
    useTabularNumbers?: boolean;
  }) => {
    const lineHeight = Math.round(Number(style?.lineHeight || 0));
    const { mass, stiffness, damping, reduceMotion } = animationConfig;

    const targetPosition = -lineHeight * number;

    const animateStyle = useAnimatedStyle(() => {
      'worklet';
      if (initialRender) {
        return {
          transform: [{ translateY: Math.round(targetPosition) }],
        };
      }

      return {
        transform: [
          {
            translateY: withDelay(
              index,
              withSpring(targetPosition, {
                mass,
                stiffness,
                damping,
                reduceMotion,
              }),
              reduceMotion,
            ),
          },
        ],
      };
    }, [number, index, lineHeight, mass, stiffness, damping, reduceMotion, initialRender, targetPosition]);

    const characterListStyle = useMemo(() => {
      if (number === 1) {
        return styles.characterListOne;
      }
      if (number === 7) {
        return styles.characterListSeven;
      }
      return styles.characterList;
    }, [number]);

    return (
      <View style={[characterListStyle, { height: lineHeight }]}>
        <Reanimated.View style={animateStyle}>
          {DIGITS.map((digit, digitIndex) => (
            <Character
              key={`${digit}-${digitIndex}`}
              style={{
                ...style,
                lineHeight,
                height: lineHeight,
              }}
              useTabularNumbers={useTabularNumbers}
            >
              {digit}
            </Character>
          ))}
        </Reanimated.View>
      </View>
    );
  },
);

const NumberFlow: React.FC<NumberFlowProps> = ({
  value,
  style,
  separatorStyle,
  animationConfig = {},
  autoFitText = false,
  useTabularNumbers = true,
  testID,
}) => {
  const [textLayout, setTextLayout] = useState<TextLayoutLine>();
  const [isMounted, setIsMounted] = useState(false);

  const {
    enabled = true,
    animateOnMount = true,
    digitDelay = 20,
    mass = 0.8,
    stiffness = 75,
    damping = 15,
    reduceMotion = ReduceMotion.System,
  } = animationConfig;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const shouldAnimate = enabled && (isMounted ? true : animateOnMount);
  const isInitialRender = !animateOnMount && !isMounted;

  const ascender = textLayout?.ascender;
  const styleFontSize = style?.fontSize;
  const fontSize = useMemo(() => {
    if (autoFitText && ascender) {
      return Math.round(ascender);
    }

    return Math.round(Number(styleFontSize || 16));
  }, [autoFitText, ascender, styleFontSize]);

  const lineHeight = useMemo(() => {
    const fromStyle = style?.lineHeight;
    const parsed = typeof fromStyle === 'number' ? fromStyle : Number(fromStyle);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
    return Math.round(fontSize * 1.2);
  }, [fontSize, style?.lineHeight]);

  const charStyle = useMemo(() => {
    return {
      ...style,
      fontSize,
      lineHeight,
      height: lineHeight,
    };
  }, [fontSize, lineHeight, style]);

  const separatorCharStyle = useMemo(() => {
    return {
      ...charStyle,
      ...separatorStyle,
    };
  }, [charStyle, separatorStyle]);

  const accessibleValue = useMemo(() => {
    return `Current value is ${value}`;
  }, [value]);

  const splitValue = useMemo(() => {
    return value.split('');
  }, [value]);

  const handleTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (autoFitText) {
        setTextLayout(e.nativeEvent.lines[0]);
      }
    },
    [autoFitText],
  );

  return (
    <View style={styles.root} collapsable={false}>
      {autoFitText && (
        <Character
          aria-hidden
          pointerEvents="none"
          onTextLayout={handleTextLayout}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.hiddenCounter, style]}
          useTabularNumbers={useTabularNumbers}
        >
          {value}
        </Character>
      )}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibleValue}
        accessibilityHint={accessibleValue}
        accessibilityLiveRegion="polite"
        style={styles.counterContainer}
        testID={testID}
      >
        {splitValue.map((char, index) => {
          if (char === ' ') {
            return (
              <Character key={index} style={charStyle} useTabularNumbers={useTabularNumbers}>
                {' '}
              </Character>
            );
          }

          if (!isNaN(Number(char))) {
            return shouldAnimate ? (
              <CharacterList
                style={charStyle}
                index={index * digitDelay}
                key={index}
                number={parseInt(char, 10)}
                animationConfig={{
                  enabled,
                  mass,
                  stiffness,
                  damping,
                  reduceMotion,
                }}
                initialRender={isInitialRender}
                useTabularNumbers={useTabularNumbers}
              />
            ) : (
              <Reanimated.View layout={LinearTransition} key={index}>
                <Character style={charStyle} useTabularNumbers={useTabularNumbers}>
                  {char}
                </Character>
              </Reanimated.View>
            );
          }

          return (
            <Character key={index} style={separatorCharStyle} useTabularNumbers={useTabularNumbers}>
              {char}
            </Character>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  counterContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  hiddenCounter: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    right: 0,
    color: 'red',
  },
  characterList: {
    overflow: 'hidden',
  },
  characterListOne: {
    overflow: 'hidden',
    marginRight: -6,
  },
  characterListSeven: {
    overflow: 'hidden',
    marginRight: -3,
  },
});

export default React.memo(NumberFlow);
