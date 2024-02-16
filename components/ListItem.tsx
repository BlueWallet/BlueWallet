import React, { useMemo } from 'react';
import { I18nManager, ActivityIndicator, TouchableOpacity, Switch, StyleSheet, Pressable, PressableProps } from 'react-native';
import { ListItem as RNElementsListItem, Avatar } from 'react-native-elements'; // Replace with actual import paths
import { useTheme } from './themes';

// Update the type for the props
interface ListItemProps {
  rightIcon?: any;
  leftAvatar?: React.Component;
  containerStyle?: object;
  Component?: typeof React.Component | typeof PressableWrapper;
  bottomDivider?: boolean;
  topDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  hideChevron?: boolean;
  disabled?: boolean;
  switch?: object; // Define more specific type if needed
  leftIcon?: any; // Define more specific type if needed
  title: string;
  subtitle?: string;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: object;
  isLoading?: boolean;
  chevron?: boolean;
  checkmark?: boolean;
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

const ListItem: React.FC<ListItemProps> = React.memo(props => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    title: {
      color: props.disabled ? colors.buttonDisabledTextColor : colors.foregroundColor,
      fontSize: 16,
      fontWeight: '500',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    },
    subtitle: {
      flexWrap: 'wrap',
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      color: colors.alternativeTextColor,
      fontWeight: '400',
      fontSize: 14,
    },
    containerStyle: {
      backgroundColor: colors.background,
    },
  });

  const memoizedSwitchProps = useMemo(() => {
    return props.switch ? { ...props.switch } : undefined;
  }, [props.switch]);

  return (
    <RNElementsListItem
      containerStyle={props.containerStyle ?? stylesHook.containerStyle}
      Component={props.Component ?? TouchableOpacityWrapper}
      bottomDivider={props.bottomDivider !== undefined ? props.bottomDivider : true}
      topDivider={props.topDivider !== undefined ? props.topDivider : false}
      testID={props.testID}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      disabled={props.disabled}
      accessible={props.switch === undefined}
    >
      {props.leftIcon && <Avatar icon={props.leftIcon} />}
      {props.leftAvatar && props.leftAvatar}
      <RNElementsListItem.Content>
        <RNElementsListItem.Title style={stylesHook.title} numberOfLines={0} accessible={props.switch === undefined}>
          {props.title}
        </RNElementsListItem.Title>
        {props.subtitle && (
          <RNElementsListItem.Subtitle
            numberOfLines={props.subtitleNumberOfLines ?? 1}
            accessible={props.switch === undefined}
            style={stylesHook.subtitle}
          >
            {props.subtitle}
          </RNElementsListItem.Subtitle>
        )}
      </RNElementsListItem.Content>
      {props.rightTitle && (
        <RNElementsListItem.Content right>
          <RNElementsListItem.Title style={props.rightTitleStyle} numberOfLines={0} right>
            {props.rightTitle}
          </RNElementsListItem.Title>
        </RNElementsListItem.Content>
      )}
      {props.isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {props.chevron && <RNElementsListItem.Chevron iconStyle={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />}
          {props.rightIcon && <Avatar icon={props.rightIcon} />}
          {props.switch && <Switch {...memoizedSwitchProps} accessibilityLabel={props.title} accessible accessibilityRole="switch" />}
          {props.checkmark && <RNElementsListItem.CheckBox iconType="octaicon" checkedColor="#0070FF" checkedIcon="check" checked />}
        </>
      )}
    </RNElementsListItem>
  );
});

export default ListItem;
