import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Switch,
  SwitchProps,
  Text,
  TextProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useLocale } from '@react-navigation/native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useTheme } from './themes';
import { Divider } from './Divider';
import Button from './Button';
interface ListItemProps {
  swipeable?: boolean;
  rightIcon?: any;
  leftAvatar?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  Component?: React.ComponentType<any>;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onDeletePressed?: () => void;
  disabled?: boolean;
  switch?: SwitchProps;
  leftIcon?: any;
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: StyleProp<TextStyle>;
  isLoading?: boolean;
  chevron?: boolean;
  checkmark?: boolean;
  subtitleProps?: TextProps;
  swipeableLeftContent?: React.ReactNode;
  swipeableRightContent?: React.ReactNode;
}

type SwipeDirection = 'left' | 'right';

type SwipeContentRenderer = React.ReactNode | ((reset: () => void) => React.ReactNode);

interface ListItemSwipeableProps {
  children: React.ReactElement;
  leftContent?: SwipeContentRenderer;
  rightContent?: SwipeContentRenderer;
  leftWidth?: number;
  rightWidth?: number;
  minSlideWidth?: number;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onSwipeBegin?: (direction: SwipeDirection) => void;
  onSwipeEnd?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

interface ListItemContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export class PressableWrapper extends React.Component<PressableProps> {
  render() {
    return <Pressable {...this.props} />;
  }
}

export class TouchableOpacityWrapper extends React.Component {
  render() {
    return <TouchableOpacity {...this.props} />;
  }
}

// Define Swipeable Button Components
const DefaultRightContent: React.FC<{ reset?: () => void; onDeletePressed?: () => void }> = ({ reset, onDeletePressed }) => (
  <Button
    title="Delete"
    onPress={() => {
      reset?.();
      onDeletePressed?.();
    }}
    icon={{ name: 'delete', type: 'material', color: 'white' }}
    style={styles.rightButton}
  />
);

const ACTION_WIDTH_FALLBACK = 96;

const SwipeableRow: React.FC<ListItemSwipeableProps> = ({
  children,
  leftContent,
  rightContent,
  leftWidth,
  rightWidth,
  minSlideWidth,
  disabled,
  containerStyle,
  style,
  onSwipeBegin,
  onSwipeEnd,
  onPressIn,
  onPressOut,
}) => {
  const hasLeft = Boolean(leftContent);
  const hasRight = Boolean(rightContent);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);
  const leftWidthRef = useRef(ACTION_WIDTH_FALLBACK);
  const rightWidthRef = useRef(ACTION_WIDTH_FALLBACK);
  const swipeDirectionRef = useRef<SwipeDirection | null>(null);

  useEffect(() => {
    if (typeof leftWidth === 'number') {
      leftWidthRef.current = leftWidth;
    }
  }, [leftWidth]);

  useEffect(() => {
    if (typeof rightWidth === 'number') {
      rightWidthRef.current = rightWidth;
    }
  }, [rightWidth]);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(() => {
      currentOffsetRef.current = 0;
    });
  }, [translateX]);

  useEffect(() => {
    if (disabled) {
      close();
    }
  }, [disabled, close]);

  const clamp = useCallback(
    (value: number) => {
      if (value > 0 && !hasLeft) {
        return 0;
      }
      if (value < 0 && !hasRight) {
        return 0;
      }
      const resolvedLeftWidth = leftWidth ?? leftWidthRef.current;
      const resolvedRightWidth = rightWidth ?? rightWidthRef.current;
      const maxLeft = hasLeft ? (resolvedLeftWidth ?? ACTION_WIDTH_FALLBACK) : 0;
      const maxRight = hasRight ? (resolvedRightWidth ?? ACTION_WIDTH_FALLBACK) : 0;
      if (value > 0) {
        return Math.min(value, maxLeft);
      }
      if (value < 0) {
        return Math.max(value, -maxRight);
      }
      return 0;
    },
    [hasLeft, hasRight],
  );

  const handleRelease = useCallback(
    (dx: number) => {
      const offset = clamp(currentOffsetRef.current + dx);
      const resolvedLeftWidth = leftWidth ?? leftWidthRef.current;
      const resolvedRightWidth = rightWidth ?? rightWidthRef.current;
      const maxLeft = hasLeft ? (resolvedLeftWidth ?? ACTION_WIDTH_FALLBACK) : 0;
      const maxRight = hasRight ? (resolvedRightWidth ?? ACTION_WIDTH_FALLBACK) : 0;
      const leftThreshold = minSlideWidth ?? maxLeft;
      const rightThreshold = minSlideWidth ?? maxRight;

      let toValue = 0;
      if (hasLeft && offset > (leftThreshold || maxLeft) / 2) {
        toValue = maxLeft;
      } else if (hasRight && offset < -(rightThreshold || maxRight) / 2) {
        toValue = -maxRight;
      }

      Animated.spring(translateX, { toValue, useNativeDriver: true }).start(() => {
        currentOffsetRef.current = toValue;
        swipeDirectionRef.current = null;
        onSwipeEnd?.();
        onPressOut?.();
      });
    },
    [clamp, hasLeft, hasRight, leftWidth, minSlideWidth, onPressOut, onSwipeEnd, rightWidth, translateX],
  );

  const panResponder = useMemo(() => {
    if (!hasLeft && !hasRight) {
      return null;
    }
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
      },
      onPanResponderGrant: () => {
        swipeDirectionRef.current = null;
        onPressIn?.();
      },
      onPanResponderMove: (_, { dx }) => {
        if (!swipeDirectionRef.current && Math.abs(dx) > 5) {
          swipeDirectionRef.current = dx > 0 ? 'right' : 'left';
          onSwipeBegin?.(swipeDirectionRef.current);
        }
        translateX.setValue(clamp(currentOffsetRef.current + dx));
      },
      onPanResponderRelease: (_, { dx }) => {
        handleRelease(dx);
      },
      onPanResponderTerminate: () => {
        close();
        onSwipeEnd?.();
        onPressOut?.();
        swipeDirectionRef.current = null;
      },
    });
  }, [clamp, close, disabled, handleRelease, hasLeft, hasRight, onPressIn, onPressOut, onSwipeBegin, onSwipeEnd, translateX]);

  const enhanceAction = useCallback(
    (content?: SwipeContentRenderer) => {
      if (!content) {
        return null;
      }
      if (typeof content === 'function') {
        return content(close);
      }
      if (React.isValidElement(content)) {
        return React.cloneElement(content, {
          reset: content.props?.reset ?? close,
        });
      }
      return content;
    },
    [close],
  );

  const handleLeftLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (typeof leftWidth === 'number') {
        return;
      }
      leftWidthRef.current = event.nativeEvent.layout.width || ACTION_WIDTH_FALLBACK;
    },
    [leftWidth],
  );

  const handleRightLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (typeof rightWidth === 'number') {
        return;
      }
      rightWidthRef.current = event.nativeEvent.layout.width || ACTION_WIDTH_FALLBACK;
    },
    [rightWidth],
  );

  if (!hasLeft && !hasRight) {
    return children;
  }

  return (
    <View style={[styles.swipeableWrapper, containerStyle]}>
      <View pointerEvents="box-none" style={styles.swipeableBackground}>
        {hasLeft && (
          <View style={styles.leftActionContainer} onLayout={handleLeftLayout}>
            {enhanceAction(leftContent)}
          </View>
        )}
        <View style={styles.flexSpacer} />
        {hasRight && (
          <View style={styles.rightActionContainer} onLayout={handleRightLayout}>
            {enhanceAction(rightContent)}
          </View>
        )}
      </View>
      <Animated.View style={[styles.swipeableContent, style, { transform: [{ translateX }] }]} {...(panResponder ? panResponder.panHandlers : {})}>
        {children}
      </Animated.View>
    </View>
  );
};

const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    swipeable = false,
    Component = TouchableOpacityWrapper,
    rightIcon,
    leftAvatar,
    containerStyle,
    bottomDivider = true,
    topDivider = false,
    testID,
    onPress,
    onLongPress,
    onDeletePressed,
    disabled,
    switch: switchProps,
    leftIcon,
    title,
    subtitle,
    subtitleNumberOfLines,
    rightTitle,
    rightTitleStyle,
    isLoading,
    chevron,
    checkmark,
    subtitleProps,
    swipeableLeftContent,
    swipeableRightContent,
  }: ListItemProps) => {
    const { colors } = useTheme();
    const { direction } = useLocale();
    const stylesHook = StyleSheet.create({
      title: {
        color: disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
        fontSize: 16,
        fontWeight: '500',
        writingDirection: direction,
      },
      subtitle: {
        flexWrap: 'wrap',
        writingDirection: direction,
        color: colors.alternativeTextColor,
        fontWeight: '400',
        paddingVertical: switchProps ? 8 : 0,
        lineHeight: 20,
        fontSize: 14,
      },

      containerStyle: {
        backgroundColor: colors.background,
      },
    });

    const memoizedSwitchProps = useMemo(() => {
      return switchProps ? { ...switchProps } : undefined;
    }, [switchProps]);

    const renderSubtitle = () => {
      if (!subtitle) {
        return null;
      }
      if (typeof subtitle === 'string' || typeof subtitle === 'number') {
        return (
          <Text
            {...subtitleProps}
            style={[stylesHook.subtitle, styles.subtitle, subtitleProps?.style]}
            numberOfLines={switchProps ? 0 : subtitleNumberOfLines ?? 1}
            accessible={switchProps === undefined}
          >
            {subtitle}
          </Text>
        );
      }
      return <View style={styles.subtitle}>{subtitle}</View>;
    };

    const renderContent = () => (
      <View style={styles.contentRow}>
        {leftIcon && (
          <>
            <View style={styles.width16} />
            <Avatar icon={leftIcon} />
          </>
        )}
        {leftAvatar && (
          <>
            {leftAvatar}
            <View style={styles.width16} />
          </>
        )}
        <View style={styles.textContainer}>
          <Text style={stylesHook.title} numberOfLines={0} accessible={switchProps === undefined}>
            {title}
          </Text>
          {renderSubtitle()}
        </View>
        {rightTitle && (
          <View style={styles.margin8}>
            <Text style={rightTitleStyle} numberOfLines={0}>
              {rightTitle}
            </Text>
          </View>
        )}
        {isLoading ? (
          <ActivityIndicator color={colors.mainColor} />
        ) : (
          <>
            {chevron && (
              <Icon
                name={direction === 'rtl' ? 'chevron-left' : 'chevron-right'}
                color={colors.alternativeTextColor}
                size={18}
                style={styles.chevron}
              />
            )}
            {rightIcon && (
              <View style={styles.rightIcon}>
                <Avatar icon={rightIcon} />
              </View>
            )}
            {switchProps && (
              <Switch
                {...memoizedSwitchProps}
                accessibilityLabel={title}
                style={StyleSheet.compose(styles.margin16, memoizedSwitchProps?.style)}
                accessible
                accessibilityRole="switch"
              />
            )}
            {checkmark && (
              <View style={[styles.checkmark, { borderColor: colors.mainColor }]}>
                <Icon name="check" color={colors.mainColor} size={14} />
              </View>
            )}
          </>
        )}
      </View>
    );

    if (swipeable && !Component) {
      console.warn('Component prop is required when swipeable is true.');
      return null;
    }

    const RootComponent = Component ?? TouchableOpacityWrapper;

    const baseRow = (
      <RootComponent
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessible={switchProps === undefined}
        accessibilityRole={onPress ? 'button' : undefined}
        style={[stylesHook.containerStyle, styles.rowContainer, containerStyle]}
      >
        {renderContent()}
      </RootComponent>
    );

    const swipeableContent = swipeable ? (
      <SwipeableRow
        leftContent={swipeableLeftContent}
        rightContent={swipeableRightContent ?? <DefaultRightContent onDeletePressed={onDeletePressed} />}
        disabled={disabled}
      >
        {baseRow}
      </SwipeableRow>
    ) : (
      baseRow
    );

    return (
      <>
        {topDivider && <Divider />}
        {swipeableContent}
        {bottomDivider && <Divider />}
      </>
    );
  },
);

const ListItemContent: React.FC<ListItemContentProps> = ({ children, style }) => {
  return <View style={StyleSheet.compose(styles.contentWrapper, style)}>{children}</View>;
};

type ListItemComponent = typeof ListItem & {
  Swipeable: React.FC<ListItemSwipeableProps>;
  Content: React.FC<ListItemContentProps>;
};

const ListItemWithStatics = ListItem as ListItemComponent;
ListItemWithStatics.Swipeable = SwipeableRow;
ListItemWithStatics.Content = ListItemContent;

export default ListItemWithStatics;

const styles = StyleSheet.create({
  rightButton: {
    minHeight: '100%',
    height: '100%',
    minWidth: 88,
    backgroundColor: 'red',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  margin8: {
    margin: 8,
  },
  margin16: {
    marginLeft: 16,
  },
  width16: { width: 16 },
  rowContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  rightIcon: {
    marginLeft: 12,
  },
  chevron: {
    marginLeft: 8,
  },
  checkmark: {
    marginLeft: 12,
    borderWidth: 1,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeableWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeableBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftActionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightActionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  flexSpacer: {
    flex: 1,
  },
  swipeableContent: {
    zIndex: 1,
  },
});
