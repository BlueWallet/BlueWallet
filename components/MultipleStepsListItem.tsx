import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, GestureResponderEvent, Platform, StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  SharedValue,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import Icon from './Icon';
import ActionSheet from '../screen/ActionSheet';
import { useTheme } from './themes';
import { ActionSheetOptions } from '../screen/ActionSheet.common';
import loc from '../loc';

export enum MultipleStepsListItemDashType {
  None = 0,
  Top = 1,
  Bottom = 2,
  TopAndBottom = 3,
}

export enum MultipleStepsListItemButtonType {
  Partial = 0,
  Full = 1,
}

const CIRCLE_SIZE = 32;
const CIRCLE_STROKE = 2;
const DASH_END_DOT_SIZE = 10;
const ITEM_SPACING = 16;
const CHECKED_TRANSITION = {
  duration: 650,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

interface TimelineCircleProps {
  progress: SharedValue<number>;
  viewBackgroundColor: string;
  borderColor: string;
  activeColor: string;
  checkColor: string;
}

const TimelineCircle: React.FC<TimelineCircleProps> = ({ progress, viewBackgroundColor, borderColor, activeColor, checkColor }) => {
  const emptyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.45, 1], [1, 1.12, 1], Extrapolation.CLAMP) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.25, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0.25, 1], [0.6, 1], Extrapolation.CLAMP) }],
  }));

  const radius = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;

  return (
    <View style={styles.vaultKeyCircleHost}>
      <Animated.View style={[styles.circleLayer, emptyStyle]} pointerEvents="none">
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            fill={viewBackgroundColor}
            stroke={borderColor}
            strokeWidth={CIRCLE_STROKE}
            strokeDasharray="5.5 2.5"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.circleLayer, styles.checkedCircle, { backgroundColor: activeColor, borderColor: activeColor }, checkStyle]}
        pointerEvents="none"
      >
        <Icon size={24} name="checkmark" type="ionicons" color={checkColor} />
      </Animated.View>
    </View>
  );
};

const DashedConnector: React.FC<{ dashes: MultipleStepsListItemDashType; color: string; height: number }> = ({ dashes, color, height }) => {
  if (dashes === MultipleStepsListItemDashType.None || height <= 0) return null;

  // Bridge the gap to the next step when the line continues downward.
  const extendsIntoSpacing = dashes === MultipleStepsListItemDashType.TopAndBottom || dashes === MultipleStepsListItemDashType.Bottom;
  const trackHeight = extendsIntoSpacing ? height + ITEM_SPACING : height;
  const y1 = dashes === MultipleStepsListItemDashType.Bottom ? height / 2 : 0;
  // Top dashes stop at the row center — add a terminal dot so the line reads as finished.
  const y2 = dashes === MultipleStepsListItemDashType.Top ? height / 2 : trackHeight;
  const showEndDot = dashes === MultipleStepsListItemDashType.Top;

  return (
    <View style={[styles.dashTrack, { height: trackHeight }]} pointerEvents="none">
      <Svg width={2} height={trackHeight}>
        <Line x1={1} y1={y1} x2={1} y2={y2} stroke={color} strokeWidth={2} strokeDasharray="6 3" strokeLinecap="butt" />
      </Svg>
      {showEndDot ? <View style={[styles.dashEndDot, { backgroundColor: color, top: height / 2 - DASH_END_DOT_SIZE / 2 }]} /> : null}
    </View>
  );
};

interface MultipleStepsListItemProps {
  circledText?: string;
  checked?: boolean;
  leftText?: string;
  showActivityIndicator?: boolean;
  isActionSheet?: boolean;
  actionSheetOptions?: Omit<ActionSheetOptions, 'anchor'>;
  dashes?: MultipleStepsListItemDashType;
  button?: {
    text?: string;
    onPress?: (e: GestureResponderEvent | number) => void;
    disabled?: boolean;
    buttonType?: MultipleStepsListItemButtonType;
    leftText?: string;
    /** Shown beside a seed (`signature`) or public key (`eye`) preview. */
    leadingIcon?: 'signature' | 'eye';
    showActivityIndicator?: boolean;
    testID?: string;
  };
  rightButton?: {
    text?: string;
    onPress?: () => void;
    disabled?: boolean;
    showActivityIndicator?: boolean;
  };
}

const MultipleStepsListItem = (props: MultipleStepsListItemProps) => {
  const { colors } = useTheme();
  const {
    showActivityIndicator = false,
    dashes = MultipleStepsListItemDashType.None,
    circledText = '',
    leftText = '',
    checked = false,
    isActionSheet = false,
    actionSheetOptions = null,
  } = props;
  const stylesHook = StyleSheet.create({
    provideKeyButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    provideKeyButtonText: {
      color: colors.buttonTextColor,
    },
    rowPartialLeftText: {
      color: colors.alternativeTextColor,
    },
    numberPill: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    buttonPartialContainer: {
      backgroundColor: colors.cardSectionHeaderBackground,
      borderColor: colors.cardSectionHeaderBackground,
    },
  });
  const selfRef = useRef(null);
  const [rowHeight, setRowHeight] = useState(0);
  const showTimelineCircle = checked || circledText.length > 0;
  const checkedProgress = useSharedValue(checked ? 1 : 0);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked !== wasChecked.current) {
      checkedProgress.value = withTiming(checked ? 1 : 0, CHECKED_TRANSITION);
    } else {
      checkedProgress.value = checked ? 1 : 0;
    }
    wasChecked.current = checked;
  }, [checked, checkedProgress]);

  const vaultKeyTitleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(checkedProgress.value, [0, 1], [colors.alternativeTextColor, colors.msSuccessBG]),
  }));

  const numberPillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(checkedProgress.value, [0, 1], [colors.buttonDisabledBackgroundColor, colors.msSuccessBG]),
  }));

  const numberPillTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(checkedProgress.value, [0, 1], [colors.alternativeTextColor, colors.msSuccessCheck]),
  }));

  const titleParts = useMemo(() => {
    if (!circledText) {
      return { before: leftText, after: '' };
    }
    const [before = '', after = ''] = loc.formatString(loc.multisig.vault_key, { number: '\u0000' }).split('\u0000');
    return { before, after };
  }, [circledText, leftText]);

  const handleOnPressForActionSheet = () => {
    if (isActionSheet && actionSheetOptions) {
      const anchor = findNodeHandle(selfRef.current);
      if (anchor === null) return;
      const modifiedOptions = { ...actionSheetOptions, anchor };

      ActionSheet.showActionSheetWithOptions(modifiedOptions, buttonIndex => {
        if (buttonIndex !== -1 && props.button?.onPress) {
          props.button.onPress(buttonIndex);
        }
      });
    }
  };

  const buttonOpacity = { opacity: props.button?.disabled ? 0.5 : 1.0 };
  const rightButtonOpacity = { opacity: props.rightButton?.disabled ? 0.5 : 1.0 };
  const onPress = isActionSheet ? handleOnPressForActionSheet : props.button?.onPress;

  return (
    <View style={styles.itemSpacing}>
      <View
        style={styles.itemBody}
        onLayout={event => {
          const nextHeight = event.nativeEvent.layout.height;
          setRowHeight(current => (current === nextHeight ? current : nextHeight));
        }}
      >
        <DashedConnector dashes={dashes} color={colors.buttonDisabledBackgroundColor} height={rowHeight} />
        <View style={styles.container}>
          <View style={styles.itemKeyUnprovidedWrapper}>
            {showTimelineCircle ? (
              <TimelineCircle
                progress={checkedProgress}
                viewBackgroundColor={colors.elevated}
                borderColor={colors.buttonDisabledBackgroundColor}
                activeColor={colors.msSuccessBG}
                checkColor={colors.msSuccessCheck}
              />
            ) : null}
            {!showActivityIndicator && leftText.length > 0 && (
              <View style={styles.vaultKeyTextWrapper}>
                {circledText ? (
                  <View style={styles.titleRow}>
                    {titleParts.before ? (
                      <Animated.Text style={[styles.vaultKeyText, vaultKeyTitleStyle]}>{titleParts.before}</Animated.Text>
                    ) : null}
                    <Animated.View style={[styles.numberPill, stylesHook.numberPill, numberPillStyle]}>
                      <Animated.Text style={[styles.numberPillText, numberPillTextStyle]}>{circledText}</Animated.Text>
                    </Animated.View>
                    {titleParts.after ? (
                      <Animated.Text style={[styles.vaultKeyText, vaultKeyTitleStyle]}>{titleParts.after}</Animated.Text>
                    ) : null}
                  </View>
                ) : (
                  <Animated.Text style={[styles.vaultKeyText, vaultKeyTitleStyle]}>{leftText}</Animated.Text>
                )}
              </View>
            )}
            {showActivityIndicator && <ActivityIndicator style={styles.activityIndicator} />}
          </View>
          {!showActivityIndicator && props.button && (
            <>
              {props.button.buttonType === undefined ||
                (props.button.buttonType === MultipleStepsListItemButtonType.Full && (
                  <Pressable
                    ref={isActionSheet ? selfRef : null}
                    testID={props.button.testID}
                    accessibilityRole="button"
                    disabled={props.button.disabled || props.button.showActivityIndicator}
                    android_ripple={{ color: colors.androidRippleColor }}
                    style={({ pressed }) => [
                      Platform.OS === 'ios' && pressed ? styles.pressed : null,
                      styles.provideKeyButton,
                      stylesHook.provideKeyButton,
                      buttonOpacity,
                    ]}
                    onPress={onPress}
                  >
                    {props.button.showActivityIndicator ? (
                      <ActivityIndicator color={colors.buttonTextColor} />
                    ) : (
                      <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.button.text}</Text>
                    )}
                  </Pressable>
                ))}
              {props.button.buttonType === MultipleStepsListItemButtonType.Partial && (
                <View style={[styles.buttonPartialContainer, stylesHook.buttonPartialContainer]}>
                  <View style={styles.partialValue}>
                    {props.button.leadingIcon === 'signature' ? (
                      <Icon name="signature" type="font-awesome-6" size={14} color={colors.alternativeTextColor} />
                    ) : props.button.leadingIcon === 'eye' ? (
                      <Icon name="eye" type="font-awesome" size={14} color={colors.alternativeTextColor} />
                    ) : null}
                    <Text numberOfLines={1} style={[styles.rowPartialLeftText, stylesHook.rowPartialLeftText]} lineBreakMode="middle">
                      {props.button.leftText}
                    </Text>
                  </View>
                  <Pressable
                    testID={props.button.testID}
                    accessibilityRole="button"
                    disabled={props.button.disabled}
                    android_ripple={{ color: colors.androidRippleColor }}
                    style={({ pressed }) => [
                      Platform.OS === 'ios' && pressed ? styles.pressed : null,
                      styles.rowPartialRightButton,
                      stylesHook.provideKeyButton,
                      rightButtonOpacity,
                    ]}
                    onPress={onPress}
                  >
                    {props.button.showActivityIndicator ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText, styles.rightButton]}>
                        {props.button.text}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
          {!showActivityIndicator && props.rightButton && checked && (
            <Animated.View entering={FadeIn.duration(550)} style={styles.rightButtonContainer}>
              <Pressable
                accessibilityRole="button"
                disabled={props.rightButton.disabled}
                style={({ pressed }) => [pressed && styles.pressed, styles.rightButton]}
                onPress={props.rightButton.onPress}
              >
                {props.rightButton.showActivityIndicator ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.rightButton.text}</Text>
                )}
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemSpacing: {
    marginBottom: ITEM_SPACING,
  },
  itemBody: {
    position: 'relative',
    overflow: 'visible',
  },
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashTrack: {
    position: 'absolute',
    top: 0,
    left: CIRCLE_SIZE / 2 - 1,
    width: 2,
    zIndex: 0,
    overflow: 'visible',
  },
  dashEndDot: {
    position: 'absolute',
    left: 1 - DASH_END_DOT_SIZE / 2,
    width: DASH_END_DOT_SIZE,
    height: DASH_END_DOT_SIZE,
    borderRadius: DASH_END_DOT_SIZE / 2,
  },
  buttonPartialContainer: {
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    flex: 1,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 5,
    marginLeft: 44,
  },
  rowPartialRightButton: {
    height: 36,
    borderRadius: 8,
    alignSelf: 'flex-end',
    minWidth: 64,
    justifyContent: 'center',
  },
  itemKeyUnprovidedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    zIndex: 1,
  },
  vaultKeyCircleHost: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_STROKE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: {
    justifyContent: 'center',
    paddingLeft: 12,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  numberPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  numberPillText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  provideKeyButton: {
    marginLeft: 44,
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rightButton: {
    borderRadius: 8,
    textAlign: 'center',
  },
  rightButtonContainer: {
    alignContent: 'center',
    justifyContent: 'center',
  },
  activityIndicator: {
    marginLeft: 44,
  },
  provideKeyButtonText: { fontWeight: '600', fontSize: 15 },
  partialValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
    marginRight: 8,
  },
  rowPartialLeftText: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default MultipleStepsListItem;
