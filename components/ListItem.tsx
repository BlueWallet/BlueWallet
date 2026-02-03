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

        {rightTitle ? (
          <View style={styles.margin8}>
            <Text style={rightTitleStyle} numberOfLines={0} accessibilityRole="text">
              {rightTitle}
            </Text>
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
            <Icon name="check" type="octicon" color={colors.foregroundColor} size={18} />
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
  margin8: {
    margin: 8,
  },
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
