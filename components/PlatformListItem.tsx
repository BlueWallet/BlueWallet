import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  OpaqueColorValue,
  Platform,
  PlatformColor,
  Pressable,
  PressableProps,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

const getAndroidColor = (colorName: string) => {
  try {
    return PlatformColor(colorName);
  } catch {
    // Fallback colors if PlatformColor fails
    const fallbacks: { [key: string]: string } = {
      '@android:color/primary_text_light': '#000000',
      '@android:color/secondary_text_light': '#757575',
      '@android:color/background_light': '#FFFFFF',
      '@android:color/darker_gray': '#AAAAAA',
      '@android:color/transparent': 'transparent',
      '@android:color/holo_blue_light': '#33B5E5',
    };
    return fallbacks[colorName] || '#000000';
  }
};

interface IconProps {
  name: string;
  type: string;
  color?: string | number | OpaqueColorValue;
  size?: number;
  backgroundColor?: string | number;
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
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Define Android-specific colors
  const androidTitleColor = isDarkMode ? '#FFFFFF' : '#202124';
  const androidSubtitleColor = isDarkMode ? '#B3B3B3' : '#5F6368';
  const androidChevronColor = isDarkMode ? '#9E9E9E' : '#757575';

  const stylesHook = StyleSheet.create({
    title: {
      color: Platform.OS === 'ios' ? PlatformColor('label') : androidTitleColor,
      fontSize: Platform.OS === 'ios' ? 17 : 20,
      fontWeight: Platform.OS === 'ios' ? '500' : '700',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    },
    subtitle: {
      flexWrap: 'wrap',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      color: Platform.OS === 'ios' ? PlatformColor('secondaryLabel') : androidSubtitleColor,
      fontWeight: Platform.OS === 'ios' ? '400' : '500',
      paddingVertical: Platform.OS === 'ios' ? 2 : 4,
      lineHeight: 20,
      fontSize: Platform.OS === 'ios' ? 15 : 17,
    },
    containerStyle: {
      backgroundColor: Platform.OS === 'ios' ? PlatformColor('secondarySystemGroupedBackground') : 'transparent',
      paddingVertical: Platform.OS === 'ios' ? 12 : 16,
      minHeight: Platform.OS === 'ios' ? 44 : 72,
      borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: Platform.OS === 'ios' ? PlatformColor('separator') : 'transparent',
      borderRadius: Platform.OS === 'ios' ? 10 : 0,
      elevation: 0,
      marginVertical: Platform.OS === 'ios' ? 0 : 8,
    },
    chevron: {
      color: Platform.OS === 'ios' ? PlatformColor('tertiaryLabel') : androidChevronColor,
      opacity: Platform.OS === 'android' ? 1 : 0.7,
    },
    iconContainer: {
      marginRight: Platform.OS === 'ios' ? 16 : 32,
      alignItems: 'center',
      justifyContent: 'center',
      width: Platform.OS === 'ios' ? 28 : 24,
      height: Platform.OS === 'ios' ? 28 : 24,
      backgroundColor: Platform.OS === 'android' ? 'transparent' : undefined,
      borderRadius: Platform.OS === 'ios' ? 6 : 0,
    },
  });

  const memoizedSwitchProps = useMemo(
    () =>
      switchProps
        ? {
            ...switchProps,
            trackColor: {
              false: Platform.OS === 'ios' ? PlatformColor('systemFill') : getAndroidColor('@android:color/darker_gray'),
              true: Platform.OS === 'ios' ? PlatformColor('systemGreen') : PlatformColor('@android:color/holo_green_light'),
            },
            ios_backgroundColor: PlatformColor('systemFill'),
          }
        : undefined,
    [switchProps],
  );

  const renderContent = () => (
    <>
      {leftIcon && (
        <View
          style={[
            styles.leftIconContainer,
            Platform.OS === 'ios'
              ? [styles.leftIconContainerIOS, stylesHook.iconContainer]
              : [styles.leftIconContainerAndroid, stylesHook.iconContainer],
            leftIcon.backgroundColor && Platform.OS === 'ios'
              ? {
                  backgroundColor:
                    typeof leftIcon.backgroundColor === 'number' ? leftIcon.backgroundColor.toString() : leftIcon.backgroundColor,
                }
              : null,
          ]}
        >
          <Avatar
            size={Platform.OS === 'ios' ? 22 : 32}
            icon={{
              name: leftIcon.name,
              type: leftIcon.type,
              color: leftIcon.color !== undefined ? String(leftIcon.color) : 'black',
              size: Platform.OS === 'ios' ? 18 : 28,
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

  const containerAndroidStyle = styles.containerAndroid;
  const swipeableAndroidStyle = styles.swipeableAndroid;
  const containerIOSStyle = {
    ...styles.containerIOS,
    ...(isFirst && styles.containerFirstIOS),
    ...(isLast && styles.containerLastIOS),
    ...(isFirst && isLast && styles.containerSingleIOS),
  };

  if (swipeable && !Component) {
    console.warn('Component prop is required when swipeable is true.');
    return null;
  }

  return swipeable ? (
    <RNElementsListItem.Swipeable
      containerStyle={[stylesHook.containerStyle, Platform.OS === 'ios' ? containerIOSStyle : swipeableAndroidStyle, containerStyle]}
      Component={Component}
      bottomDivider={Platform.OS === 'ios' ? bottomDivider && !isLast : false}
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
      containerStyle={[stylesHook.containerStyle, Platform.OS === 'ios' ? containerIOSStyle : containerAndroidStyle, containerStyle]}
      Component={Component}
      bottomDivider={Platform.OS === 'ios' ? bottomDivider && !isLast : false}
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
  leftIconContainer: {
    marginLeft: Platform.OS === 'ios' ? 12 : 16,
    marginRight: Platform.OS === 'ios' ? 16 : 32,
    width: Platform.OS === 'ios' ? 28 : 32,
    height: Platform.OS === 'ios' ? 28 : 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainerIOS: {
    borderRadius: 6,
  },
  leftIconContainerAndroid: {
    borderRadius: 0,
  },
  transformRTL: {
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  containerAndroid: {
    borderRadius: 0,
    elevation: 0,
    marginVertical: 8,
    backgroundColor: 'transparent',
  },
  containerIOS: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  containerFirstIOS: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  containerLastIOS: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  containerSingleIOS: {
    borderRadius: 10,
  },
  swipeableAndroid: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 2,
    marginVertical: 4,
  },
});

export default PlatformListItem;
