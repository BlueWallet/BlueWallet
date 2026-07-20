import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  SwitchProps,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useLocale } from '@react-navigation/native';

import Icon from './Icon';
import { useTheme } from './themes';

/** Base row height for transaction list `getItemLayout` (padding + title + subtitle at fontScale 1). */
export const TX_ROW_BASE_HEIGHT = 64;

export interface ListItemProps {
  leftAvatar?: React.JSX.Element;
  containerStyle?: StyleProp<ViewStyle>;
  noFeedback?: boolean;
  bottomDivider?: boolean;
  testID?: string;
  switchTestID?: string;
  onPress?: () => void;
  disabled?: boolean;
  switch?: SwitchProps;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: StyleProp<TextStyle>;
  rightTitleSelectable?: boolean;
  rightSubtitle?: string | React.ReactNode;
  rightSubtitleStyle?: StyleProp<TextStyle>;
  chevron?: boolean;
  checkmark?: boolean;
  isLoading?: boolean;
}

const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    leftAvatar,
    containerStyle,
    noFeedback = false,
    bottomDivider = true,
    testID,
    switchTestID,
    onPress,
    disabled,
    switch: switchProps,
    title,
    titleStyle,
    subtitle,
    subtitleNumberOfLines,
    rightTitle,
    rightTitleStyle,
    rightTitleSelectable,
    rightSubtitle,
    rightSubtitleStyle,
    chevron,
    checkmark,
    isLoading,
  }: ListItemProps) => {
    const { colors } = useTheme();
    const { direction } = useLocale();
    const { fontScale } = useWindowDimensions();
    const isRtl = direction === 'rtl';
    const contentRowStyle = useMemo(
      () => ({
        paddingVertical: Math.round(12 * fontScale),
      }),
      [fontScale],
    );
    const stylesHook = StyleSheet.create({
      title: {
        color: disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
        fontSize: 16,
        fontWeight: '500',
        lineHeight: Math.round(22 * fontScale),
        writingDirection: direction,
      },
      rightMemoText: {
        textAlign: direction === 'rtl' ? 'left' : 'right',
      },
      subtitle: {
        flexWrap: 'wrap',
        writingDirection: direction,
        color: colors.alternativeTextColor,
        fontWeight: '400',
        paddingVertical: switchProps ? 8 : 0,
        lineHeight: Math.round(20 * fontScale),
        fontSize: 14,
        marginTop: 2,
      },

      containerStyle: {
        backgroundColor: colors.background,
      },
      divider: {
        borderBottomWidth: bottomDivider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.formBorder,
      },
    });

    const memoizedSwitchProps = useMemo(() => {
      return switchProps ? { ...switchProps } : undefined;
    }, [switchProps]);
    const resolvedSwitchTestID = switchTestID ?? memoizedSwitchProps?.testID;
    const enableFeedback = !noFeedback && !!onPress && !disabled;

    const renderContent = () => (
      <View style={[styles.contentRow, contentRowStyle]}>
        {leftAvatar && (
          <View style={styles.leftAvatarContainer}>
            {leftAvatar}
            <View style={styles.width16} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={[stylesHook.title, titleStyle]} numberOfLines={0} accessibilityRole="text">
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={switchProps ? 0 : (subtitleNumberOfLines ?? 1)} accessibilityRole="text" style={stylesHook.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightTitle || rightSubtitle ? (
          <View style={styles.rightColumn}>
            {rightTitle ? (
              <Text
                style={rightTitleStyle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                accessibilityRole="text"
                selectable={rightTitleSelectable}
              >
                {rightTitle}
              </Text>
            ) : null}
            {rightSubtitle != null && rightSubtitle !== '' ? (
              <View style={styles.rightMemoWrapper}>
                {typeof rightSubtitle === 'string' ? (
                  <Text style={[stylesHook.subtitle, rightSubtitleStyle, stylesHook.rightMemoText]} numberOfLines={1} ellipsizeMode="tail">
                    {rightSubtitle}
                  </Text>
                ) : (
                  rightSubtitle
                )}
              </View>
            ) : null}
          </View>
        ) : null}
        {isLoading ? (
          <ActivityIndicator accessibilityRole="progressbar" />
        ) : (
          <>
            {chevron ? (
              <Icon name={isRtl ? 'angle-left' : 'angle-right'} type="font-awesome" color={colors.alternativeTextColor} size={18} />
            ) : null}
            {switchProps ? (
              <Switch
                {...memoizedSwitchProps}
                testID={resolvedSwitchTestID}
                accessibilityLabel={title}
                accessibilityHint={typeof subtitle === 'string' ? subtitle : undefined}
                style={styles.margin16}
                accessible
                accessibilityRole="switch"
              />
            ) : null}
            {checkmark ? (
              <View style={styles.checkmarkContainer}>
                <Icon name="check" type="material-community" color={colors.foregroundColor} size={18} />
              </View>
            ) : null}
          </>
        )}
      </View>
    );

    if (!onPress) {
      return (
        <View testID={testID} style={[stylesHook.containerStyle, stylesHook.divider, containerStyle, disabled && styles.disabled]}>
          {renderContent()}
        </View>
      );
    }

    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        android_ripple={enableFeedback ? { color: colors.androidRippleColor } : undefined}
        style={({ pressed }) => [
          stylesHook.containerStyle,
          stylesHook.divider,
          containerStyle,
          disabled && styles.disabled,
          enableFeedback && pressed && styles.pressed,
        ]}
      >
        {renderContent()}
      </Pressable>
    );
  },
);

export default ListItem;

const styles = StyleSheet.create({
  margin16: {
    marginLeft: 16,
  },
  width16: { width: 16 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  leftAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  rightColumn: {
    marginStart: 8,
    flexShrink: 0,
    alignItems: 'flex-end',
    alignSelf: 'center',
  },
  rightMemoWrapper: {
    flexShrink: 1,
    minWidth: 0,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.6,
  },
});
