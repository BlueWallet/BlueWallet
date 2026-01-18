import React, { useMemo, ComponentType, ReactElement } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  PressableProps,
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
import { Avatar, Icon, ListItem as RNElementsListItem } from '@rneui/themed';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { platformColors, platformSizing, platformLayout, isAndroid as isAndroidPlatform } from './platform/utils';
import { useTheme } from '../components/themes';

type IconProps = {
  name: string;
  type?: string;
  color?: string;
  backgroundColor?: string;
};

// Platform-specific horizontal padding constants
const HORIZONTAL_PADDING = {
  ios: 16,
  android: 20,
};

interface ListItemProps {
  swipeable?: boolean;
  rightIcon?: any;
  leftAvatar?: React.JSX.Element;
  containerStyle?: object;
  Component?: ComponentType<any> | React.ElementType;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onDeletePressed?: () => void;
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
  swipeableLeftContent?: React.ReactNode;
  swipeableRightContent?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  sectionMap?: Record<number, string[]>;
  sectionId?: string;
  sectionNumber?: number;
}

export const determineSectionPosition = (
  sectionMap: Record<number, string[]> | undefined,
  id: string,
  sectionNumber: number | undefined,
): { isFirstInSection: boolean; isLastInSection: boolean } => {
  if (!sectionMap || !sectionNumber || !id) {
    return { isFirstInSection: false, isLastInSection: false };
  }

  const sectionItems = sectionMap[Math.floor(sectionNumber)];
  if (!sectionItems || !sectionItems.includes(id)) {
    return { isFirstInSection: false, isLastInSection: false };
  }

  const indexInSection = sectionItems.indexOf(id);
  return {
    isFirstInSection: indexInSection === 0,
    isLastInSection: indexInSection === sectionItems.length - 1,
  };
};

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

const DefaultRightContent: React.FC<{ reset: () => void; onDeletePressed?: () => void }> = ({ reset, onDeletePressed }) => (
  <TouchableOpacity
    style={styles.rightButton}
    onPress={() => {
      reset();
      onDeletePressed?.();
    }}
    accessible
    accessibilityLabel="Delete"
    accessibilityRole="button"
    accessibilityHint="Deletes this item"
  >
    <Icon name="trash-outline" size={24} color="white" />
  </TouchableOpacity>
);

const PlatformListItem: React.FC<ListItemProps> = ({
  swipeable = false,
  Component,
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
  swipeableLeftContent,
  swipeableRightContent,
  isLast = false,
  isFirst = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  sectionMap,
  sectionId,
  sectionNumber,
}) => {
  // Use the consolidated styling hook
  const colors = platformColors;
  const sizing = platformSizing;
  const layout = platformLayout;
  const isAndroid = isAndroidPlatform;
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

  if (sectionMap && sectionId && sectionNumber) {
    const { isFirstInSection, isLastInSection } = determineSectionPosition(sectionMap, sectionId, sectionNumber);

    if (isFirstInSection || isLastInSection) {
      isFirst = isFirstInSection;
      isLast = isLastInSection;
    }
  }

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
    if (swipeable) {
      dynamicContainerStyle = {
        borderRadius: 0,
        overflow: 'hidden',
        elevation: layout.showElevation ? 2 : 0,
        marginVertical: 1,
      };
    } else {
      dynamicContainerStyle = {
        borderRadius: 0,
        elevation: layout.showElevation ? sizing.containerElevation : 0,
        marginVertical: isAndroid ? 0 : 1, // No vertical margin for Android settings items
        backgroundColor: colors.cardBackground,
      };
    }
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

  if (swipeable) {
    return (
      <RNElementsListItem.Swipeable
        containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
        Component={Component as any}
        bottomDivider={shouldShowBottomDivider}
        topDivider={topDivider}
        testID={switchProps ? undefined : testID}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        leftContent={swipeableLeftContent}
        rightContent={swipeableRightContent ?? <DefaultRightContent reset={() => {}} onDeletePressed={onDeletePressed} />}
        {...accessibilityProps}
      >
        {renderContent()}
      </RNElementsListItem.Swipeable>
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
  rightButton: {
    minHeight: '100%',
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
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
