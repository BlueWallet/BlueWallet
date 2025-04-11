import React, { useMemo, ComponentType } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  OpaqueColorValue,
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

interface SectionMappingProps {
  sectionMap?: Record<number, string[]>;
  sectionId?: string;
  sectionNumber?: number;
}

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
  sectionNumber: number | undefined
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
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  sectionMap,
  sectionId,
  sectionNumber,
}) => {
  const { sizing, colors, layout } = usePlatformTheme();
  const { fontScale } = useWindowDimensions();

  const minHeight = Math.max(46, 46 * fontScale);

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
      paddingVertical: sizing.containerPaddingVertical,
      minHeight,
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
          }
        : undefined,
    [switchProps],
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
          importantForAccessibility="no"
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
          <View style={styles.width16} importantForAccessibility="no" />
        </>
      )}
      <RNElementsListItem.Content>
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
              iconStyle={StyleSheet.flatten([styles.transformRTL, stylesHook.chevron])}
              importantForAccessibility="no"
            />
          )}
          {rightIcon && <Avatar icon={rightIcon} />}
          {switchProps && (
            <Switch
              {...memoizedSwitchProps}
              style={styles.margin16}
              accessibilityLabel={accessibilityLabel || title}
              accessible
              accessibilityRole="switch"
            />
          )}
          {checkmark && (
            <RNElementsListItem.CheckBox
              iconRight
              containerStyle={stylesHook.containerStyle}
              iconType="octaicon"
              checkedIcon="check"
              checked
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
  const accessibilityProps = getAccessibilityProps();

  return swipeable ? (
    <RNElementsListItem.Swipeable
      containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
      Component={Component as any}
      bottomDivider={shouldShowBottomDivider}
      topDivider={topDivider}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      leftContent={swipeableLeftContent}
      rightContent={swipeableRightContent ?? <DefaultRightContent reset={() => {}} onDeletePressed={onDeletePressed} />}
      {...accessibilityProps}
    >
      {renderContent()}
    </RNElementsListItem.Swipeable>
  ) : (
    <RNElementsListItem
      containerStyle={[stylesHook.containerStyle, dynamicContainerStyle, containerStyle]}
      Component={Component as any}
      bottomDivider={shouldShowBottomDivider}
      topDivider={topDivider}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      pad={16}
      {...accessibilityProps}
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
