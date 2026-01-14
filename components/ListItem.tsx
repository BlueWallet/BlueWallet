import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import { useLocale } from '@react-navigation/native';

import { useTheme } from './themes';

// Update the type for the props
interface ListItemProps {
  rightIcon?: any;
  leftAvatar?: React.JSX.Element;
  containerStyle?: object;
  Component?: typeof React.Component | typeof PressableWrapper;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  switch?: object; // Define more specific type if needed
  leftIcon?: any; // Define more specific type if needed
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: object;
  isLoading?: boolean;
  chevron?: boolean;
  checkmark?: boolean;
  subtitleProps?: object;
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

const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    Component = TouchableOpacityWrapper,
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
  }: ListItemProps) => {
    const { colors } = useTheme();
    const { direction } = useLocale();
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
    });

    const memoizedSwitchProps = useMemo(() => {
      return switchProps ? { ...switchProps } : undefined;
    }, [switchProps]);

    const renderContent = () => (
      <>
        {leftIcon && (
          <>
            <View style={styles.width16} />
            <Avatar icon={leftIcon} />
          </>
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
            <RNElementsListItem.Title style={rightTitleStyle} numberOfLines={0}>
              {rightTitle}
            </RNElementsListItem.Title>
          </View>
        )}
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            {chevron && <RNElementsListItem.Chevron iconStyle={{ transform: [{ scaleX: direction === 'rtl' ? -1 : 1 }] }} />}
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

    return (
      <RNElementsListItem
        containerStyle={containerStyle ?? stylesHook.containerStyle}
        Component={Component}
        bottomDivider={bottomDivider}
        topDivider={topDivider}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessible={switchProps === undefined}
      >
        {renderContent()}
      </RNElementsListItem>
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
});
