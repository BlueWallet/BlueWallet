import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  OpaqueColorValue,
  Pressable,
  PressableProps,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePlatformTheme } from './platformThemes';

interface IconProps {
  name: string;
  type: string;
  color?: string | number | OpaqueColorValue;
  size?: number;
  backgroundColor?: string | number | OpaqueColorValue;
}

interface ListItemProps {
  swipeable?: boolean;
  rightIcon?: any;
  leftAvatar?: React.JSX.Element;
  containerStyle?: object;
  Component?: typeof React.Component | typeof PressableWrapper;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onDeletePressed?: () => void;
  disabled?: boolean;
  switch?: object;
  leftIcon?: IconProps;
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

const DefaultRightContent: React.FC<{ reset: () => void; onDeletePressed?: () => void }> = ({ reset, onDeletePressed }) => (
  <TouchableOpacity
    style={styles.rightButton}
    onPress={() => {
      reset();
      onDeletePressed?.();
    }}
  >
    <Ionicons name="trash-outline" size={24} color="white" />
  </TouchableOpacity>
);

const PlatformListItem: React.FC<ListItemProps> = ({
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
  swipeableLeftContent,
  swipeableRightContent,
  isLast = false,
  isFirst = false,
}) => {
  const { sizing, colors, layout } = usePlatformTheme();

  // Ensure minimum height of 44px for accessibility
  const minHeight = 44;

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
      lineHeight: sizing.subtitleLineHeight,
      fontSize: sizing.subtitleFontSize,
    },
    containerStyle: {
      backgroundColor: colors.cardBackground,
      paddingVertical: sizing.containerPaddingVertical,
      minHeight, // Updated to use the minimum of 44px
      height: minHeight, // Fixed height to ensure consistency between all items
      borderBottomWidth: layout.showBorderBottom ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: layout.showBorderBottom ? colors.separatorColor || 'rgba(0,0,0,0.1)' : 'transparent',
      borderRadius: layout.showBorderRadius ? sizing.containerBorderRadius : 0,
      elevation: sizing.containerElevation,
      marginVertical: sizing.containerMarginVertical,
    },
    chevron: {
      color: colors.chevronColor,
      opacity: layout.showBorderRadius ? 0.7 : 1,
    },
    iconContainer: {
      marginRight: sizing.leftIconMarginRight,
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
            trackColor: {
              false: colors.switchTrackColorFalse,
              true: colors.switchTrackColorTrue,
            },
            ios_backgroundColor: colors.switchIosBackgroundColor,
          }
        : undefined,
    [switchProps, colors],
  );

  const renderContent = () => (
    <>
      {leftIcon && (
        <View
          style={[
            styles.iconContainerBase,
            {
              marginLeft: sizing.leftIconMarginLeft,
              marginRight: sizing.leftIconMarginRight,
              width: sizing.leftIconWidth,
              height: sizing.leftIconHeight,
              borderRadius: sizing.iconContainerBorderRadius,
            },
            stylesHook.iconContainer,
            leftIcon.backgroundColor && layout.showIconBackground
              ? {
                  backgroundColor:
                    typeof leftIcon.backgroundColor === 'number' ? leftIcon.backgroundColor.toString() : leftIcon.backgroundColor,
                }
              : null,
          ]}
        >
          <Avatar
            size={sizing.iconSize}
            icon={{
              name: leftIcon.name,
              type: leftIcon.type,
              color: leftIcon.color !== undefined ? String(leftIcon.color) : 'black',
              size: sizing.iconInnerSize,
            }}
            containerStyle={styles.transparentBackground}
          />
        </View>
      )}
      {leftAvatar && (
        <>
          {leftAvatar}
          <View style={styles.width16} />
        </>
      )}
      <RNElementsListItem.Content>
        <RNElementsListItem.Title style={stylesHook.title} numberOfLines={0} accessible={switchProps === undefined}>
          {title}
        </RNElementsListItem.Title>
        {subtitle && (
          <RNElementsListItem.Subtitle
            numberOfLines={switchProps ? 0 : (subtitleNumberOfLines ?? 1)}
            accessible={switchProps === undefined}
            style={stylesHook.subtitle}
          >
            {subtitle}
          </RNElementsListItem.Subtitle>
        )}
      </RNElementsListItem.Content>

      {rightTitle && (
        <View style={styles.margin8}>
          <RNElementsListItem.Title style={[stylesHook.subtitle, rightTitleStyle]} numberOfLines={0}>
            {rightTitle}
          </RNElementsListItem.Title>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {chevron && <RNElementsListItem.Chevron iconStyle={StyleSheet.flatten([styles.transformRTL, stylesHook.chevron])} />}
          {rightIcon && <Avatar icon={rightIcon} />}
          {switchProps && (
            <Switch {...memoizedSwitchProps} accessibilityLabel={title} style={styles.margin16} accessible accessibilityRole="switch" />
          )}
          {checkmark && (
            <RNElementsListItem.CheckBox
              iconRight
              containerStyle={stylesHook.containerStyle}
              iconType="octaicon"
              checkedIcon="check"
              checked
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
        borderTopLeftRadius: sizing.containerBorderRadius,
        borderTopRightRadius: sizing.containerBorderRadius,
      }),
      ...(isLast && {
        borderBottomLeftRadius: sizing.containerBorderRadius,
        borderBottomRightRadius: sizing.containerBorderRadius,
      }),
      ...(isFirst &&
        isLast && {
          borderRadius: sizing.containerBorderRadius,
        }),
    };
  } else {
    // Android style
    if (swipeable) {
      dynamicContainerStyle = {
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 2,
        marginVertical: 4,
      };
    } else {
      dynamicContainerStyle = {
        borderRadius: 0,
        elevation: 0,
        marginVertical: 8,
        backgroundColor: 'transparent',
      };
    }
  }

  if (swipeable && !Component) {
    console.warn('Component prop is required when swipeable is true.');
    return null;
  }

  const shouldShowBottomDivider = layout.showBorderBottom && bottomDivider && !isLast;

  return swipeable ? (
    <RNElementsListItem.Swipeable
      containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
      Component={Component}
      bottomDivider={shouldShowBottomDivider}
      topDivider={topDivider}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      leftContent={swipeableLeftContent}
      rightContent={swipeableRightContent ?? <DefaultRightContent reset={() => {}} onDeletePressed={onDeletePressed} />}
      accessible={switchProps === undefined}
    >
      {renderContent()}
    </RNElementsListItem.Swipeable>
  ) : (
    <RNElementsListItem
      containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
      Component={Component}
      bottomDivider={shouldShowBottomDivider}
      topDivider={topDivider}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessible={switchProps === undefined}
      pad={16}
    >
      {renderContent()}
    </RNElementsListItem>
  );
};

const styles = StyleSheet.create({
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
});

export default PlatformListItem;
