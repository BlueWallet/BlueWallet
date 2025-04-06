import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  PlatformColor,
  Pressable,
  PressableProps,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
  leftIcon?: any;
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
  isFirst = false,
  isLast = false,
}) => {
  const stylesHook = StyleSheet.create({
    title: {
      color: disabled ? PlatformColor('tertiaryLabel') : PlatformColor('label'),
      fontSize: 17,
      fontWeight: '400',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    },
    subtitle: {
      flexWrap: 'wrap',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      color: PlatformColor('secondaryLabel'),
      fontWeight: '400',
      paddingVertical: switchProps ? 8 : 0,
      lineHeight: 20,
      fontSize: 15,
    },
    containerStyle: {
      backgroundColor: Platform.select({
        ios: PlatformColor('secondarySystemGroupedBackground'),
        android: PlatformColor('@android:color/background_light'),
      }),
      paddingVertical: 11,
      minHeight: 44,
      borderTopLeftRadius: isFirst ? 10 : 0,
      borderTopRightRadius: isFirst ? 10 : 0,
      borderBottomLeftRadius: isLast ? 10 : 0,
      borderBottomRightRadius: isLast ? 10 : 0,
      borderBottomWidth: isLast || !bottomDivider ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: Platform.select({
        ios: PlatformColor('separator'),
        android: PlatformColor('@android:color/darker_gray'),
      }),
    },
    chevron: {
      color: Platform.select({
        ios: PlatformColor('tertiaryLabel'),
        android: PlatformColor('@android:color/tertiary_text_light'),
      }),
      opacity: 0.7,
    },
  });

  const memoizedSwitchProps = useMemo(
    () =>
      switchProps
        ? {
            ...switchProps,
            trackColor: {
              false: Platform.select({
                ios: PlatformColor('systemFill'),
                android: PlatformColor('@android:color/darker_gray'),
              }),
              true: Platform.select({
                ios: PlatformColor('systemGreen'),
                android: PlatformColor('@android:color/holo_green_light'),
              }),
            },
            ios_backgroundColor: PlatformColor('systemFill'),
          }
        : undefined,
    [switchProps],
  );

  const renderContent = () => (
    <>
      {leftIcon && (
        <View style={styles.leftIconContainer}>
          <Avatar
            size={22}
            icon={{
              name: leftIcon.name,
              type: leftIcon.type,
              color: leftIcon.color,
              size: Platform.OS === 'ios' ? 18 : 24,
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
          {chevron && (
            <RNElementsListItem.Chevron
              iconStyle={StyleSheet.flatten([{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }, stylesHook.chevron])}
            />
          )}
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

  if (swipeable && !Component) {
    console.warn('Component prop is required when swipeable is true.');
    return null;
  }

  return swipeable ? (
    <RNElementsListItem.Swipeable
      containerStyle={[stylesHook.containerStyle, containerStyle]}
      Component={Component}
      bottomDivider={bottomDivider && !isLast}
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
      containerStyle={[stylesHook.containerStyle, containerStyle]}
      Component={Component}
      bottomDivider={bottomDivider && !isLast}
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
    marginLeft: 12,
    marginRight: 16,
    width: 28,
    height: 28,
    backgroundColor: Platform.select({
      ios: PlatformColor('systemGray5'),
      android: PlatformColor('transparent'),
    }),
    borderRadius: Platform.OS === 'ios' ? 6 : 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
});

export default PlatformListItem;
