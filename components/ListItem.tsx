import React, { useMemo } from 'react';
import { Pressable, PressableProps, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ListItem as RNElementsListItem } from '@rneui/themed';
import { useLocale } from '@react-navigation/native';

import { useTheme } from './themes';

interface ListItemProps {
  leftAvatar?: React.JSX.Element;
  containerStyle?: object;
  Component?: typeof React.Component | typeof PressableWrapper;
  bottomDivider?: boolean;
  testID?: string;
  onPress?: () => void;
  disabled?: boolean;
  switch?: object;
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleNumberOfLines?: number;
  rightTitle?: string;
  rightTitleStyle?: object;
  rightSubtitle?: string | React.ReactNode;
  rightSubtitleStyle?: object;
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

const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    Component = TouchableOpacityWrapper,
    leftAvatar,
    containerStyle,
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
    });

    const memoizedSwitchProps = useMemo(() => {
      return switchProps ? { ...switchProps } : undefined;
    }, [switchProps]);

    const renderContent = () => (
      <>
        {leftAvatar && (
          <>
            {leftAvatar}
            <View style={styles.width16} />
          </>
        )}
        <View style={styles.leftContentWrapper}>
          <RNElementsListItem.Content style={styles.leftContent}>
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
        </View>

        {(rightTitle || rightSubtitle) && (
          <View style={[styles.rightColumnMargin, styles.rightColumn]}>
            <View style={styles.rightColumnStack}>
              {rightTitle && (
                <RNElementsListItem.Title style={rightTitleStyle} numberOfLines={1}>
                  {rightTitle}
                </RNElementsListItem.Title>
              )}
              {rightSubtitle != null && rightSubtitle !== '' && (
                <View style={styles.rightMemoWrapper}>
                  <Text style={[stylesHook.subtitle, rightSubtitleStyle, stylesHook.rightMemoText]} numberOfLines={1} ellipsizeMode="tail">
                    {rightSubtitle}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        {chevron && <RNElementsListItem.Chevron iconStyle={{ transform: [{ scaleX: direction === 'rtl' ? -1 : 1 }] }} />}
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
    );

    return (
      <RNElementsListItem
        containerStyle={containerStyle ?? stylesHook.containerStyle}
        Component={Component}
        bottomDivider={bottomDivider}
        testID={testID}
        onPress={onPress}
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
  margin16: {
    marginLeft: 16,
  },
  width16: { width: 16 },
  leftContentWrapper: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  leftContent: {
    flex: 0,
  },
  rightColumnMargin: {
    marginStart: 8,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  rightColumnStack: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: 0,
  },
  rightMemoWrapper: {
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
});
