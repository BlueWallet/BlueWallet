import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Switch, SwitchProps, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useLocale } from '@react-navigation/native';

import Icon from './Icon';
import { useTheme } from './themes';

interface ListItemProps {
  leftAvatar?: React.JSX.Element;
  containerStyle?: StyleProp<ViewStyle>;
  noFeedback?: boolean;
  bottomDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  disabled?: boolean;
  switch?: SwitchProps;
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: StyleProp<TextStyle>;
  rightSubtitle?: string | React.ReactNode;
  rightSubtitleStyle?: StyleProp<TextStyle>;
  chevron?: boolean;
  checkmark?: boolean;
}

const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    leftAvatar,
    containerStyle,
    noFeedback = false,
    bottomDivider = true,
    testID,
    onPress,
    disabled,
    switch: switchProps,
    title,
    subtitle,
    subtitleNumberOfLines,
    rightTitle,
    rightTitleStyle,
    rightSubtitle,
    rightSubtitleStyle,
    chevron,
    checkmark,
  }: ListItemProps) => {
    const { colors } = useTheme();
    const { direction } = useLocale();
    const isRtl = direction === 'rtl';
    const stylesHook = StyleSheet.create({
      title: {
        color: disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
        fontSize: 16,
        fontWeight: '500',
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
        lineHeight: 20,
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
    const enableFeedback = !noFeedback && !!onPress && !disabled;

    const renderContent = () => (
      <View style={styles.contentRow}>
        {leftAvatar && (
          <View style={styles.leftAvatarContainer}>
            {leftAvatar}
            <View style={styles.width16} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={stylesHook.title} numberOfLines={0} accessibilityRole="text">
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
              <Text style={rightTitleStyle} numberOfLines={1} accessibilityRole="text">
                {rightTitle}
              </Text>
            ) : null}
            {rightSubtitle != null && rightSubtitle !== '' ? (
              <View style={styles.rightMemoWrapper}>
                <Text style={[stylesHook.subtitle, rightSubtitleStyle, stylesHook.rightMemoText]} numberOfLines={1} ellipsizeMode="tail">
                  {rightSubtitle}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {chevron ? (
          <Icon name={isRtl ? 'angle-left' : 'angle-right'} type="font-awesome" color={colors.alternativeTextColor} size={18} />
        ) : null}
        {switchProps ? (
          <Switch {...memoizedSwitchProps} accessibilityLabel={title} style={styles.margin16} accessible accessibilityRole="switch" />
        ) : null}
        {checkmark ? (
          <View style={styles.checkmarkContainer}>
            <Icon name="check" type="material-community" color={colors.foregroundColor} size={18} />
          </View>
        ) : null}
      </View>
    );

    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={onPress ? 'button' : undefined}
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
    justifyContent: 'center',
  },
  leftAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightColumn: {
    marginStart: 8,
    minWidth: 0,
    alignItems: 'flex-end',
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
