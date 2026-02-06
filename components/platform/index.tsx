import React, { forwardRef, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatListProps,
  I18nManager,
  Platform,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StyleSheet,
  Switch,
  SwitchProps,
  Text,
  TextProps,
  TouchableNativeFeedback,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import SafeAreaFlatList from '../SafeAreaFlatList';
import SafeAreaScrollView from '../SafeAreaScrollView';
import { platformColors, useTheme } from '../themes';
export { platformColors } from '../themes';

export const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

export const platformSizing = {
  horizontalPadding: isIOS ? 16 : 20,
  verticalPadding: isIOS ? 12 : 8,
  sectionSpacing: isIOS ? 32 : 16,
  basePadding: 16,
  contentContainerMarginHorizontal: isIOS ? 16 : 0,
  contentContainerPaddingHorizontal: isIOS ? 0 : 16,
  firstSectionContainerPaddingTop: isIOS ? 16 : 8,
  sectionContainerMarginBottom: isIOS ? 4 : 16,
  itemMinHeight: 44,
  containerBorderRadius: isIOS ? 10 : 4,
  iconContainerBorderRadius: isIOS ? 6 : 0,
  titleFontSize: isIOS ? 17 : 16,
  subtitleFontSize: isIOS ? 15 : 14,
  titleFontWeight: isIOS ? ('600' as const) : ('500' as const),
  subtitleFontWeight: '400' as const,
  subtitlePaddingVertical: 2,
  subtitleLineHeight: 20,
  iconSize: isIOS ? 22 : 24,
  iconContainerSize: isIOS ? 28 : 24,
  iconInnerSize: isIOS ? 20 : 22,
  leftIconMarginLeft: 0,
  leftIconMarginRight: 12,
  containerPaddingVertical: isIOS ? 12 : 8,
  containerElevation: isIOS ? 0 : 2,
  containerMarginVertical: 0,
};

export const platformLayout = {
  showIconBackground: isIOS,
  showElevation: isAndroid,
  rippleEffect: isAndroid,
  showBorderRadius: true,
  showBorderBottom: isIOS,
  useRoundedListItems: isIOS,
  cardShadow: isAndroid
    ? {}
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
};

export const getSettingsHeaderOptions = (
  title: string,
  colors: { text?: string; foregroundColor?: string; background?: string } = platformColors,
) => {
  const headerTextColor = 'text' in colors ? colors.text : colors.foregroundColor;
  const headerBackgroundColor = 'background' in colors ? colors.background : platformColors.background;

  return {
    title,
    headerLargeTitle: isIOS,
    headerLargeTitleStyle: isIOS ? { color: headerTextColor } : undefined,
    headerTitleStyle: { color: headerTextColor },
    headerBackButtonDisplayMode: 'minimal' as const,
    headerBackTitle: '',
    headerBackVisible: true,
    headerTransparent: false,
    headerBlurEffect: undefined,
    headerStyle: { backgroundColor: headerBackgroundColor },
  };
};

const getSettingsHeaderHeight = (insetsTop?: number) => {
  if (!isAndroid) return 0;
  return 56 + (StatusBar.currentHeight ?? insetsTop ?? 24);
};

export const SettingsText: React.FC<TextProps> = ({ style, ...rest }) => {
  const themeStyles = usePlatformStyles();
  return <Text accessibilityRole="text" style={[themeStyles.text, style]} {...rest} />;
};

export const SettingsSubtitle: React.FC<TextProps> = ({ style, ...rest }) => {
  const themeStyles = usePlatformStyles();
  return <Text accessibilityRole="text" style={[themeStyles.subtitle, style]} {...rest} />;
};

interface SettingsSectionProps extends ViewProps {
  compact?: boolean;
  horizontalInset?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ style, compact, horizontalInset = true, ...rest }) => {
  const themeStyles = usePlatformStyles();
  return (
    <View
      style={[themeStyles.section, compact && themeStyles.sectionCompact, horizontalInset && themeStyles.sectionInset, style]}
      {...rest}
    />
  );
};

interface SettingsSectionHeaderProps extends ViewProps {
  title: string;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ title, style, ...rest }) => {
  const themeStyles = usePlatformStyles();
  return (
    <View accessibilityRole="header" accessibilityLabel={title} style={[themeStyles.sectionHeaderContainer, style]} {...rest}>
      <Text style={themeStyles.sectionHeaderText}>{title}</Text>
    </View>
  );
};

interface SettingsCardProps extends ViewProps {
  compact?: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ style, compact, ...rest }) => {
  const themeStyles = usePlatformStyles();
  return <View style={[themeStyles.card, compact && themeStyles.cardCompact, style]} {...rest} />;
};

interface SettingsScrollViewProps extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  headerHeight?: number;
  floatingButtonHeight?: number;
}

export const SettingsScrollView = forwardRef<ScrollView, SettingsScrollViewProps>((props, ref) => {
  const { contentContainerStyle, headerHeight, floatingButtonHeight, ...rest } = props;
  const insets = useSafeAreaInsets();
  const resolvedHeaderHeight = useMemo(() => headerHeight ?? getSettingsHeaderHeight(insets.top), [headerHeight, insets.top]);

  return (
    <SafeAreaScrollView
      ref={ref}
      headerHeight={resolvedHeaderHeight}
      floatingButtonHeight={floatingButtonHeight}
      contentContainerStyle={[staticStyles.contentContainer, contentContainerStyle]}
      {...rest}
    />
  );
});

SettingsScrollView.displayName = 'SettingsScrollView';

interface SettingsFlatListProps<ItemT> extends Omit<FlatListProps<ItemT>, 'contentContainerStyle'> {
  contentContainerStyle?: FlatListProps<ItemT>['contentContainerStyle'];
  headerHeight?: number;
  floatingButtonHeight?: number;
}

export const SettingsFlatList = <ItemT,>(props: SettingsFlatListProps<ItemT>) => {
  const { contentContainerStyle, headerHeight, floatingButtonHeight, ...rest } = props;
  const insets = useSafeAreaInsets();
  const resolvedHeaderHeight = useMemo(() => headerHeight ?? getSettingsHeaderHeight(insets.top), [headerHeight, insets.top]);

  return (
    <SafeAreaFlatList
      headerHeight={resolvedHeaderHeight}
      floatingButtonHeight={floatingButtonHeight}
      contentContainerStyle={[staticStyles.contentContainer, contentContainerStyle]}
      {...rest}
    />
  );
};

export type SettingsIconName =
  | 'settings'
  | 'currency'
  | 'language'
  | 'security'
  | 'network'
  | 'tools'
  | 'about'
  | 'notifications'
  | 'lightning'
  | 'blockExplorer'
  | 'electrum'
  | 'licensing'
  | 'releaseNotes'
  | 'selfTest'
  | 'performance'
  | 'github'
  | 'search'
  | 'paperPlane'
  | 'key';

type SettingsListItemPosition = 'single' | 'first' | 'middle' | 'last';

interface IconProps {
  name: string;
  type?: string;
  color?: string;
  backgroundColor?: string;
}

const renderVectorIcon = (icon: IconProps) => {
  const size = platformSizing.iconInnerSize;
  const color = icon.color ?? 'black';
  switch (icon.type) {
    case 'ionicon':
      return <Ionicons name={icon.name} size={size} color={color} />;
    case 'material':
      return <MaterialIcon name={icon.name} size={size} color={color} />;
    case 'material-community':
      return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
    default:
      return <FontAwesome5 name={icon.name} size={size} color={color} />;
  }
};

export interface SettingsListItemProps {
  title: string;
  subtitle?: string | React.ReactNode;
  onPress?: () => void;
  testID?: string;
  chevron?: boolean;
  switch?: SwitchProps;
  isLoading?: boolean;
  Component?: React.ComponentType<any> | React.ElementType;
  rightTitle?: string;
  disabled?: boolean;
  checkmark?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  iconName?: SettingsIconName;
  leftIcon?: IconProps | React.ReactElement;
  position?: SettingsListItemPosition;
  spacingTop?: boolean;
}

const isIconProps = (icon: IconProps | React.ReactElement): icon is IconProps => 'name' in icon;

const usePlatformStyles = () => {
  const { colors } = useTheme();
  return useMemo(() => {
    const card = colors.lightButton ?? colors.modal ?? colors.elevated ?? colors.background;
    const secondaryText = colors.alternativeTextColor ?? colors.darkGray;

    return {
      text: { color: colors.foregroundColor, fontSize: platformSizing.titleFontSize },
      subtitle: { color: secondaryText, fontSize: platformSizing.subtitleFontSize, marginTop: isAndroid ? 5 : 2 },
      section: { marginTop: isAndroid ? 16 : 8, marginBottom: platformSizing.sectionSpacing / 2 },
      sectionCompact: { marginTop: isAndroid ? 8 : 4, marginBottom: 8 },
      sectionInset: { marginHorizontal: isAndroid ? 0 : platformSizing.horizontalPadding },
      sectionHeaderContainer: {
        marginTop: platformSizing.sectionSpacing,
        marginBottom: 8,
        paddingHorizontal: platformSizing.horizontalPadding,
      },
      sectionHeaderText: {
        fontSize: isAndroid ? platformSizing.subtitleFontSize : 13,
        fontWeight: isAndroid ? '500' : '400',
        color: secondaryText,
      },
      card: {
        backgroundColor: isAndroid ? colors.background : card,
        borderRadius: isAndroid ? 0 : platformSizing.containerBorderRadius,
        paddingHorizontal: isAndroid ? platformSizing.horizontalPadding : 0,
        paddingVertical: isAndroid ? platformSizing.verticalPadding : 0,
        overflow: isAndroid ? 'visible' : 'hidden',
        ...(isAndroid ? {} : { elevation: 1 }),
      },
      cardCompact: {
        paddingVertical: isAndroid ? platformSizing.verticalPadding : 0,
        paddingHorizontal: isAndroid ? platformSizing.horizontalPadding : 0,
      },
      listItemContainer: { backgroundColor: isAndroid ? colors.background : card },
      listItemContainerIOS: { marginHorizontal: platformSizing.horizontalPadding },
      listItemNoGap: { marginVertical: 0 },
      listItemContainerAndroid: { minHeight: 56 },
      listItemFirst: {
        borderTopLeftRadius: platformSizing.containerBorderRadius * 1.5,
        borderTopRightRadius: platformSizing.containerBorderRadius * 1.5,
      },
      listItemLast: {
        borderBottomLeftRadius: platformSizing.containerBorderRadius * 1.5,
        borderBottomRightRadius: platformSizing.containerBorderRadius * 1.5,
      },
      listItemSpacingTop: { marginTop: isAndroid ? platformSizing.sectionSpacing : 12 },
    } as const;
  }, [colors]);
};

const getIconConfig = (name: SettingsIconName, dark: boolean): IconProps => {
  const configs: Record<SettingsIconName, { ios: IconProps; android: IconProps }> = {
    settings: {
      ios: { name: 'settings-outline', type: 'ionicon', color: dark ? '#FFFFFF' : '#5F6368', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
      android: { name: 'settings', type: 'material', color: dark ? '#FFFFFF' : '#5F6368' },
    },
    currency: {
      ios: { name: 'cash-outline', type: 'ionicon', color: dark ? '#7EE0A4' : '#0F9D58', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
      android: { name: 'attach-money', type: 'material', color: dark ? '#7EE0A4' : '#0F9D58' },
    },
    language: {
      ios: { name: 'language-outline', type: 'ionicon', color: dark ? '#FFD580' : '#F4B400', backgroundColor: 'rgba(255, 149, 0, 0.12)' },
      android: { name: 'language', type: 'material', color: dark ? '#FFD580' : '#F4B400' },
    },
    security: {
      ios: {
        name: 'shield-checkmark-outline',
        type: 'ionicon',
        color: dark ? '#FF8E8E' : '#DB4437',
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
      },
      android: { name: 'security', type: 'material', color: dark ? '#FF8E8E' : '#DB4437' },
    },
    network: {
      ios: { name: 'globe-outline', type: 'ionicon', color: dark ? '#82B1FF' : '#1A73E8', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
      android: { name: 'public', type: 'material', color: dark ? '#82B1FF' : '#1A73E8' },
    },
    tools: {
      ios: {
        name: 'construct-outline',
        type: 'ionicon',
        color: dark ? '#D0BCFF' : '#673AB7',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'build', type: 'material', color: dark ? '#D0BCFF' : '#673AB7' },
    },
    about: {
      ios: {
        name: 'information-circle-outline',
        type: 'ionicon',
        color: dark ? '#FFFFFF' : '#5F6368',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'info', type: 'material', color: dark ? '#FFFFFF' : '#5F6368' },
    },
    notifications: {
      ios: {
        name: 'notifications-outline',
        type: 'ionicon',
        color: dark ? '#82B1FF' : '#1A73E8',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'notifications', type: 'material', color: dark ? '#82B1FF' : '#1A73E8' },
    },
    lightning: {
      ios: { name: 'flash-outline', type: 'ionicon', color: dark ? '#FFD580' : '#F4B400', backgroundColor: 'rgba(255, 149, 0, 0.12)' },
      android: { name: 'flash-on', type: 'material', color: dark ? '#FFD580' : '#F4B400' },
    },
    blockExplorer: {
      ios: { name: 'search-outline', type: 'ionicon', color: dark ? '#82B1FF' : '#1A73E8', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
      android: { name: 'search', type: 'material', color: dark ? '#82B1FF' : '#1A73E8' },
    },
    electrum: {
      ios: { name: 'server-outline', type: 'ionicon', color: dark ? '#69F0AE' : '#0F9D58', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
      android: { name: 'storage', type: 'material', color: dark ? '#69F0AE' : '#0F9D58' },
    },
    licensing: {
      ios: {
        name: 'shield-checkmark-outline',
        type: 'ionicon',
        color: dark ? '#FFFFFF' : '#24292e',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'verified-user', type: 'material', color: dark ? '#FFFFFF' : '#24292e' },
    },
    releaseNotes: {
      ios: {
        name: 'document-text-outline',
        type: 'ionicon',
        color: dark ? '#FFFFFF' : '#9AA0AA',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'description', type: 'material', color: dark ? '#FFFFFF' : '#9AA0AA' },
    },
    selfTest: {
      ios: { name: 'flask-outline', type: 'ionicon', color: dark ? '#FFFFFF' : '#FC0D44', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
      android: { name: 'flask-outline', type: 'material-community', color: dark ? '#FFFFFF' : '#FC0D44' },
    },
    performance: {
      ios: {
        name: 'speedometer-outline',
        type: 'ionicon',
        color: dark ? '#FFFFFF' : '#FC0D44',
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
      },
      android: { name: 'speedometer', type: 'material-community', color: dark ? '#FFFFFF' : '#FC0D44' },
    },
    github: {
      ios: { name: 'logo-github', type: 'ionicon', color: dark ? '#FFFFFF' : '#24292e', backgroundColor: 'rgba(24, 23, 23, 0.1)' },
      android: { name: 'code', type: 'material', color: dark ? '#FFFFFF' : '#24292e' },
    },
    search: {
      ios: { name: 'search-outline', type: 'ionicon', color: dark ? '#82B1FF' : '#1A73E8', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
      android: { name: 'search', type: 'material', color: dark ? '#82B1FF' : '#1A73E8' },
    },
    paperPlane: {
      ios: {
        name: 'paper-plane-outline',
        type: 'ionicon',
        color: dark ? '#82B1FF' : '#1A73E8',
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
      },
      android: { name: 'send', type: 'material', color: dark ? '#82B1FF' : '#1A73E8' },
    },
    key: {
      ios: { name: 'key-outline', type: 'ionicon', color: dark ? '#69F0AE' : '#0F9D58', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
      android: { name: 'vpn-key', type: 'material', color: dark ? '#69F0AE' : '#0F9D58' },
    },
  };

  const config = configs[name] ?? configs.settings;
  return isIOS ? config.ios : config.android;
};

export const SettingsListItem: React.FC<SettingsListItemProps> = ({
  title,
  subtitle,
  onPress,
  testID,
  chevron,
  switch: switchProps,
  isLoading,
  Component,
  rightTitle,
  disabled,
  checkmark,
  accessibilityLabel,
  accessibilityHint,
  iconName,
  leftIcon,
  position = 'middle',
  spacingTop,
}) => {
  const theme = useTheme();
  const { colors: themeColors, dark } = theme;
  const { fontScale } = useWindowDimensions();

  const themeStyles = usePlatformStyles();
  const resolvedIcon = leftIcon ?? (iconName ? getIconConfig(iconName, dark) : undefined);
  const isSingle = position === 'single';
  const isFirst = position === 'first' || isSingle;
  const isLast = position === 'last' || isSingle;
  const resolvedAccessibilityLabel = accessibilityLabel ?? title;
  const resolvedAccessibilityHint = accessibilityHint ?? (typeof subtitle === 'string' ? subtitle : undefined);

  const minHeight = Math.max(platformSizing.itemMinHeight, platformSizing.itemMinHeight * fontScale);

  const dynamicStyles = useMemo(
    () =>
      ({
        title: {
          color: platformColors.text,
          fontSize: platformSizing.titleFontSize,
          fontWeight: platformSizing.titleFontWeight,
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        subtitle: {
          flexWrap: 'wrap',
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
          color: platformColors.secondaryText,
          fontWeight: platformSizing.subtitleFontWeight,
          paddingVertical: platformSizing.subtitlePaddingVertical,
          lineHeight: platformSizing.subtitleLineHeight * fontScale,
          fontSize: platformSizing.subtitleFontSize,
        },
        container: {
          backgroundColor: platformColors.card,
          paddingVertical: isAndroid ? 8 : platformSizing.containerPaddingVertical,
          paddingHorizontal: platformSizing.horizontalPadding,
          minHeight,
          borderBottomWidth: platformLayout.showBorderBottom && !isLast ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: platformLayout.showBorderBottom && !isLast ? platformColors.separator : 'transparent',
          elevation: platformLayout.showElevation ? platformSizing.containerElevation : 0,
          marginVertical: isAndroid ? 0 : platformSizing.containerMarginVertical,
        },
        chevron: {
          color: platformColors.chevron,
          opacity: 0.7,
        },
      }) as const,
    [fontScale, minHeight, isLast],
  );

  const containerStyle = [
    themeStyles.listItemContainer,
    themeStyles.listItemNoGap,
    isAndroid && themeStyles.listItemContainerAndroid,
    isIOS && themeStyles.listItemContainerIOS,
    isIOS && isFirst && themeStyles.listItemFirst,
    isIOS && isLast && themeStyles.listItemLast,
    spacingTop && themeStyles.listItemSpacingTop,
  ];

  const borderRadius = platformSizing.containerBorderRadius * 1.5;
  const dynamicContainerStyle = platformLayout.useRoundedListItems
    ? {
        borderRadius: 0,
        overflow: 'hidden' as const,
        ...(isFirst && { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }),
        ...(isLast && { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }),
        ...(isFirst && isLast && { borderRadius }),
      }
    : {
        borderRadius: 0,
        elevation: platformLayout.showElevation ? platformSizing.containerElevation : 0,
        marginVertical: isAndroid ? 0 : 1,
        backgroundColor: platformColors.card,
      };

  const outerContainerStyle = [
    containerStyle,
    dynamicContainerStyle,
    {
      backgroundColor: dynamicStyles.container.backgroundColor,
      borderBottomWidth: dynamicStyles.container.borderBottomWidth,
      borderBottomColor: dynamicStyles.container.borderBottomColor,
      elevation: dynamicStyles.container.elevation,
      marginVertical: dynamicStyles.container.marginVertical,
    },
  ];

  const innerContainerStyle = [
    dynamicStyles.container,
    {
      backgroundColor: dynamicStyles.container.backgroundColor,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      borderRadius: 0,
      elevation: 0,
      marginVertical: 0,
    },
  ];

  const memoizedSwitchProps = useMemo(() => (switchProps ? { ...switchProps } : undefined), [switchProps]);

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: switchProps ? ('switch' as const) : ('button' as const),
    accessibilityLabel: resolvedAccessibilityLabel,
    accessibilityHint: resolvedAccessibilityHint,
    accessibilityState: { disabled, checked: switchProps?.value },
  };

  const renderLeftIcon = () => {
    if (!resolvedIcon) return null;
    if (!isIconProps(resolvedIcon)) {
      return (
        <View
          style={[
            staticStyles.iconContainerBase,
            { marginLeft: platformSizing.leftIconMarginLeft, marginRight: platformSizing.leftIconMarginRight },
          ]}
          importantForAccessibility="no"
        >
          {resolvedIcon}
        </View>
      );
    }
    return (
      <View
        style={[
          staticStyles.iconContainerBase,
          {
            marginLeft: platformSizing.leftIconMarginLeft,
            marginRight: platformSizing.leftIconMarginRight,
            width: platformSizing.iconContainerSize,
            height: platformSizing.iconContainerSize,
            borderRadius: platformSizing.iconContainerBorderRadius,
          },
          resolvedIcon.backgroundColor && platformLayout.showIconBackground && { backgroundColor: resolvedIcon.backgroundColor },
        ]}
        importantForAccessibility="no"
      >
        {renderVectorIcon(resolvedIcon)}
      </View>
    );
  };

  const renderContent = () => (
    <>
      {renderLeftIcon()}
      <View style={staticStyles.flexGrow}>
        <Text style={dynamicStyles.title} numberOfLines={0} accessibilityRole="text">
          {title}
        </Text>
        {subtitle && (
          <Text numberOfLines={0} accessibilityRole="text" style={dynamicStyles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightTitle && (
        <View style={staticStyles.margin8} importantForAccessibility="no">
          <Text style={dynamicStyles.subtitle} numberOfLines={0} accessibilityRole="text">
            {rightTitle}
          </Text>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator accessibilityRole="progressbar" accessibilityLabel="Loading" />
      ) : (
        <>
          {chevron && (
            <MaterialIcon
              name="chevron-right"
              size={24}
              color={dynamicStyles.chevron.color}
              style={StyleSheet.flatten([staticStyles.transformRTL, isAndroid && { marginRight: 8 }])}
              importantForAccessibility="no"
            />
          )}
          {switchProps && (
            <Switch
              {...memoizedSwitchProps}
              testID={testID}
              style={staticStyles.switchMargin}
              accessibilityLabel={resolvedAccessibilityLabel}
              accessible
              accessibilityRole="switch"
            />
          )}
          {checkmark && (
            <MaterialIcon
              name="check"
              size={20}
              color={themeColors.successCheck}
              style={staticStyles.checkmarkIcon}
              importantForAccessibility="no"
            />
          )}
        </>
      )}
    </>
  );

  if (isAndroid && platformLayout.rippleEffect && onPress) {
    return (
      <TouchableNativeFeedback
        background={TouchableNativeFeedback.Ripple('#CCCCCC', false)}
        useForeground
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityRole="button"
        accessibilityHint={resolvedAccessibilityHint}
        testID={testID}
      >
        <View style={[innerContainerStyle, outerContainerStyle, staticStyles.androidRippleContainer]}>{renderContent()}</View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <View style={outerContainerStyle}>
      <View style={innerContainerStyle} testID={switchProps ? undefined : testID} {...accessibilityProps}>
        {(() => {
          const Container = (onPress ? (Component ?? TouchableOpacity) : View) as React.ElementType;
          return (
            <Container onPress={onPress} disabled={disabled} style={staticStyles.touchableContent}>
              {renderContent()}
            </Container>
          );
        })()}
      </View>
    </View>
  );
};

const staticStyles = StyleSheet.create({
  contentContainer: { paddingHorizontal: 0 },
  iconContainerBase: { alignItems: 'center', justifyContent: 'center' },
  flexGrow: { flexGrow: 1, flexShrink: 1 },
  margin8: { margin: 8 },
  touchableContent: { flexDirection: 'row', alignItems: 'center' },
  switchMargin: { marginLeft: 16 },
  checkmarkIcon: { marginLeft: 8 },
  transformRTL: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
  androidRippleContainer: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
});
