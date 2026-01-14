import React, { useMemo, ComponentType, ReactElement } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  StyleSheet,
  Switch,
  SwitchProps,
  TouchableOpacity,
  View,
  AccessibilityState,
  useWindowDimensions,
  AccessibilityRole,
  Platform,
  TouchableNativeFeedback,
} from 'react-native';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import type { IconProps } from '../theme/platformStyles';
import { usePlatformStyles } from '../theme/platformStyles';
import { useTheme } from '../components/themes';

// Platform-specific horizontal padding constants
const HORIZONTAL_PADDING = {
  ios: 16,
  android: 20,
};

interface ListItemProps {
  rightIcon?: any;
  leftAvatar?: React.JSX.Element;
  containerStyle?: object;
  Component?: ComponentType<any> | React.ElementType;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  switch?: SwitchProps;
  leftIcon?: IconProps | ReactElement;
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: object;
  isLoading?: boolean;
  chevron?: boolean;
  checkmark?: boolean;
  subtitleProps?: object;
  isFirst?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

class TouchableOpacityWrapper extends React.Component {
  render() {
    return <TouchableOpacity {...this.props} />;
  }
}

const PlatformListItem: React.FC<ListItemProps> = ({
  Component,
  rightIcon,
  leftAvatar,
  containerStyle,
  bottomDivider = true,
  topDivider = false,
  testID,
  onPress,
  onLongPress,
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
  isLast = false,
  isFirst = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}) => {
  // Use the consolidated styling hook
  const { colors, sizing, layout, isAndroid } = usePlatformStyles();
  const { colors: themeColors } = useTheme(); // For successCheck color
  const { fontScale } = useWindowDimensions();

  // Set default component based on platform
  if (!Component) {
    Component =
      Platform.OS === 'ios'
        ? TouchableOpacityWrapper
        : layout.rippleEffect
          ? (props: any) => (
              <TouchableNativeFeedback
                background={TouchableNativeFeedback.Ripple('#ccc', false)}
                useForeground={true}
                disabled={props.disabled}
                {...props}
              >
                <View style={props.style}>{props.children}</View>
              </TouchableNativeFeedback>
            )
          : TouchableOpacityWrapper;
  }

  const minHeight = Math.max(sizing.itemMinHeight, sizing.itemMinHeight * fontScale);

  const stylesHook = StyleSheet.create({
    title: {
      color: colors.titleColor,
      fontSize: sizing.titleFontSize,
      fontWeight: sizing.titleFontWeight,
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    },
    subtitle: {
      flexWrap: 'wrap',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      color: colors.subtitleColor,
      fontWeight: sizing.subtitleFontWeight,
      paddingVertical: sizing.subtitlePaddingVertical,
      lineHeight: sizing.subtitleLineHeight * fontScale,
      fontSize: sizing.subtitleFontSize,
    },
    containerStyle: {
      backgroundColor: colors.cardBackground,
      paddingVertical: isAndroid ? 8 : sizing.containerPaddingVertical, // Less padding for Android
      paddingHorizontal: isAndroid ? HORIZONTAL_PADDING.android : HORIZONTAL_PADDING.ios, // Platform-specific horizontal padding
      minHeight,
      borderBottomWidth: layout.showBorderBottom && bottomDivider ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: layout.showBorderBottom && bottomDivider ? colors.separatorColor || 'rgba(0,0,0,0.1)' : 'transparent',
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius : 0,
      elevation: layout.showElevation ? sizing.containerElevation : 0,
      marginVertical: isAndroid ? 0 : sizing.containerMarginVertical,
    },
    chevron: {
      color: colors.chevronColor,
      opacity: layout.showBorderRadius ? 0.7 : 1,
    },
    iconContainer: {
      marginRight: isAndroid ? sizing.leftIconMarginRight : sizing.leftIconMarginRight,
      alignItems: 'center',
      justifyContent: 'center',
      width: sizing.iconContainerSize,
      height: sizing.iconContainerSize,
      backgroundColor: layout.showIconBackground ? undefined : 'transparent',
      borderRadius: sizing.iconContainerBorderRadius,
    },
  });

  const memoizedSwitchProps = useMemo(
    () =>
      switchProps
        ? {
            ...switchProps,
            // Use Android-specific styles for switch when on Android
            ...(isAndroid && {
              trackColor: {
                false: colors.switchTrackColorFalse,
                true: colors.switchTrackColorTrue,
              },
              // Calculate the thumbColor immediately instead of passing a function
              thumbColor:
                typeof colors.switchThumbColor === 'function'
                  ? colors.switchThumbColor(switchProps.value || false)
                  : colors.switchThumbColor,
            }),
          }
        : undefined,
    [switchProps, isAndroid, colors],
  );

  const getAccessibilityProps = () => {
    const baseProps = {
      accessible: true,
      accessibilityRole: (switchProps ? 'switch' : 'button') as AccessibilityRole,
      accessibilityLabel: accessibilityLabel || title,
      accessibilityHint: accessibilityHint || (subtitle && typeof subtitle === 'string' ? subtitle : undefined),
      accessibilityState: {
        ...accessibilityState,
        disabled,
        checked: switchProps?.value,
      },
    };

    return baseProps;
  };

  const renderContent = () => (
    <>
      {leftIcon && (
        <>
          {React.isValidElement(leftIcon) ? (
            // If leftIcon is a React element, render it directly with some margin
            <View
              style={[
                styles.iconContainerBase,
                {
                  marginLeft: isAndroid ? sizing.leftIconMarginLeft : sizing.leftIconMarginLeft,
                  marginRight: isAndroid ? sizing.leftIconMarginRight : sizing.leftIconMarginRight,
                },
              ]}
              importantForAccessibility="no"
            >
              {leftIcon}
            </View>
          ) : (
            // Otherwise treat it as an IconProps object
            <View
              style={[
                styles.iconContainerBase,
                {
                  marginLeft: isAndroid ? sizing.leftIconMarginLeft : sizing.leftIconMarginLeft,
                  width: sizing.leftIconWidth,
                  height: sizing.leftIconHeight,
                  borderRadius: sizing.iconContainerBorderRadius,
                },
                stylesHook.iconContainer,
                (leftIcon as IconProps).backgroundColor && layout.showIconBackground
                  ? {
                      backgroundColor: (leftIcon as IconProps).backgroundColor as string,
                    }
                  : null,
              ]}
              importantForAccessibility="no"
            >
              <Avatar
                size={sizing.iconSize}
                icon={{
                  name: (leftIcon as IconProps).name,
                  type: (leftIcon as IconProps).type || 'font-awesome-5',
                  color: (leftIcon as IconProps).color !== undefined ? String((leftIcon as IconProps).color) : 'black',
                  size: sizing.iconInnerSize,
                }}
                containerStyle={styles.transparentBackground}
              />
            </View>
          )}
        </>
      )}
      {leftAvatar && (
        <>
          {leftAvatar}
          <View style={styles.width16} importantForAccessibility="no" />
        </>
      )}
      <RNElementsListItem.Content style={styles.flexGrow}>
        <RNElementsListItem.Title style={stylesHook.title} numberOfLines={0} accessibilityRole="text">
          {title}
        </RNElementsListItem.Title>
        {subtitle && (
          <RNElementsListItem.Subtitle
            numberOfLines={switchProps ? 0 : (subtitleNumberOfLines ?? 0)}
            accessibilityRole="text"
            style={stylesHook.subtitle}
          >
            {subtitle}
          </RNElementsListItem.Subtitle>
        )}
      </RNElementsListItem.Content>

      {rightTitle && (
        <View style={styles.margin8} importantForAccessibility="no">
          <RNElementsListItem.Title style={[stylesHook.subtitle, rightTitleStyle]} numberOfLines={0} accessibilityRole="text">
            {rightTitle}
          </RNElementsListItem.Title>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator accessibilityRole="progressbar" accessibilityLabel="Loading" />
      ) : (
        <>
          {chevron && (
            <RNElementsListItem.Chevron
              iconStyle={StyleSheet.flatten([
                styles.transformRTL,
                stylesHook.chevron,
                isAndroid && { marginRight: 8 }, // Add margin for Android
              ])}
              importantForAccessibility="no"
            />
          )}
          {rightIcon && <Avatar icon={rightIcon} />}
          {switchProps && (
            <Switch
              {...memoizedSwitchProps}
              testID={testID}
              style={[styles.margin16, isAndroid && { transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }] }]}
              accessibilityLabel={accessibilityLabel || title}
              accessible
              accessibilityRole="switch"
            />
          )}
          {checkmark && (
            <MaterialIcon
              name="check"
              size={20}
              color={themeColors.successCheck}
              style={styles.checkmarkIcon}
              importantForAccessibility="no"
            />
          )}
        </>
      )}
    </>
  );

  let dynamicContainerStyle = {};

  if (layout.useRoundedListItems) {
    dynamicContainerStyle = {
      borderRadius: 0,
      overflow: 'hidden',
      ...(isFirst && {
        borderTopLeftRadius: sizing.containerBorderRadius * 1.5,
        borderTopRightRadius: sizing.containerBorderRadius * 1.5,
      }),
      ...(isLast && {
        borderBottomLeftRadius: sizing.containerBorderRadius * 1.5,
        borderBottomRightRadius: sizing.containerBorderRadius * 1.5,
      }),
      ...(isFirst &&
        isLast && {
          borderRadius: sizing.containerBorderRadius * 1.5,
        }),
    };
  } else {
    // Android style
    dynamicContainerStyle = {
      borderRadius: 0,
      elevation: layout.showElevation ? sizing.containerElevation : 0,
      marginVertical: isAndroid ? 0 : 1, // No vertical margin for Android settings items
      backgroundColor: colors.cardBackground,
    };
  }

  const shouldShowBottomDivider = layout.showBorderBottom && bottomDivider && !isLast;
  const accessibilityProps = getAccessibilityProps();

  if (isAndroid && layout.rippleEffect && onPress) {
    const androidRippleConfig = {
      color: '#CCCCCC',
      borderless: false,
      foreground: true,
    };

    return (
      <TouchableNativeFeedback
        background={TouchableNativeFeedback.Ripple(androidRippleConfig.color, androidRippleConfig.borderless)}
        useForeground={androidRippleConfig.foreground}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint || (subtitle && typeof subtitle === 'string' ? subtitle : undefined)}
        testID={testID}
      >
        <View style={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle, styles.androidRippleContainer]}>
          {renderContent()}
        </View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <RNElementsListItem
      containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
      Component={Component as any}
      bottomDivider={shouldShowBottomDivider}
      topDivider={topDivider}
      testID={switchProps ? undefined : testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      pad={isAndroid ? 0 : 16} // No padding for Android
      {...accessibilityProps}
    >
      {renderContent()}
    </RNElementsListItem>
  );
};

const styles = StyleSheet.create({
  checkmarkIcon: {
    marginLeft: 8,
  },
  margin8: {
    margin: 8,
  },
  margin16: {
    marginLeft: 16,
  },
  width16: { width: 16 },
  iconContainerBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transformRTL: {
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  flexGrow: {
    flexGrow: 1,
    flexShrink: 1,
  },
  androidRippleContainer: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PlatformListItem;
