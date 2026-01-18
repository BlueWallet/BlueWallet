import React, { forwardRef, useMemo } from 'react';
import {
  FlatListProps,
  Platform,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeAreaScrollView from '../SafeAreaScrollView';
import SafeAreaFlatList from '../SafeAreaFlatList';
import PlatformListItem from '../PlatformListItem';
import { platformColors, platformLayout, platformSizing, isAndroid, isDarkMode } from './utils';

export const getSettingsHeaderOptions = (title: string) => {
  return {
    title,
    headerLargeTitle: Platform.OS === 'ios',
    headerLargeTitleStyle:
      Platform.OS === 'ios'
        ? {
            color: platformColors.text || '#000000',
          }
        : undefined,
    headerTitleStyle: {
      color: platformColors.text || '#000000',
    },
    headerBackButtonDisplayMode: 'minimal' as const,
    headerBackTitle: '',
    headerBackVisible: true,
    headerTransparent: true,
    headerBlurEffect: undefined,
    headerStyle: {
      backgroundColor: 'transparent',
    },
  };
};

const getSettingsHeaderHeight = (insetsTop?: number) => {
  if (Platform.OS !== 'android') {
    return 0;
  }

  const statusBarHeight = StatusBar.currentHeight ?? insetsTop ?? 24;
  return 56 + statusBarHeight;
};

export const SettingsText: React.FC<TextProps> = ({ style, ...rest }) => {
  return <Text accessibilityRole="text" style={[styles.text, style]} {...rest} />;
};

export const SettingsSubtitle: React.FC<TextProps> = ({ style, ...rest }) => {
  return <Text accessibilityRole="text" style={[styles.subtitle, style]} {...rest} />;
};

export interface SettingsSectionProps extends ViewProps {
  compact?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ style, compact = false, ...rest }) => {
  return <View style={[styles.section, compact && styles.sectionCompact, style]} {...rest} />;
};

export interface SettingsSectionHeaderProps extends ViewProps {
  title: string;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ title, style, ...rest }) => {
  return (
    <View accessibilityRole="header" accessibilityLabel={title} style={[styles.sectionHeaderContainer, style]} {...rest}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
};

export interface SettingsCardProps extends ViewProps {
  compact?: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ style, compact = false, ...rest }) => {
  return <View style={[styles.card, compact && styles.cardCompact, style]} {...rest} />;
};

export interface SettingsScrollViewProps extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  headerHeight?: number;
  floatingButtonHeight?: number;
}

export const SettingsScrollView = forwardRef<ScrollView, SettingsScrollViewProps>((props, ref) => {
  const { contentContainerStyle, headerHeight, floatingButtonHeight, ...rest } = props;
  const insets = useSafeAreaInsets();
  const resolvedHeaderHeight = useMemo(() => {
    return headerHeight ?? getSettingsHeaderHeight(insets.top);
  }, [headerHeight, insets.top]);

  return (
    <SafeAreaScrollView
      ref={ref}
      headerHeight={resolvedHeaderHeight}
      floatingButtonHeight={floatingButtonHeight}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      {...rest}
    />
  );
});

SettingsScrollView.displayName = 'SettingsScrollView';

export interface SettingsFlatListProps<ItemT> extends Omit<FlatListProps<ItemT>, 'contentContainerStyle'> {
  contentContainerStyle?: FlatListProps<ItemT>['contentContainerStyle'];
  headerHeight?: number;
}

export const SettingsFlatList = <ItemT,>(props: SettingsFlatListProps<ItemT>) => {
  const { contentContainerStyle, headerHeight, ...rest } = props;
  const insets = useSafeAreaInsets();
  const resolvedHeaderHeight = useMemo(() => {
    return headerHeight ?? getSettingsHeaderHeight(insets.top);
  }, [headerHeight, insets.top]);

  return (
    <SafeAreaFlatList
      headerHeight={resolvedHeaderHeight}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
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
  | 'privacy'
  | 'notifications'
  | 'lightning'
  | 'blockExplorer'
  | 'defaultView'
  | 'electrum'
  | 'licensing'
  | 'releaseNotes'
  | 'selfTest'
  | 'performance'
  | 'github'
  | 'x'
  | 'twitter'
  | 'telegram'
  | 'search'
  | 'paperPlane'
  | 'key';

export type SettingsListItemPosition = 'single' | 'first' | 'middle' | 'last';

type PlatformListItemProps = React.ComponentProps<typeof PlatformListItem>;

export interface SettingsListItemProps extends Omit<PlatformListItemProps, 'containerStyle' | 'leftIcon' | 'bottomDivider'> {
  iconName?: SettingsIconName;
  leftIcon?: PlatformListItemProps['leftIcon'];
  position?: SettingsListItemPosition;
  spacingTop?: boolean;
}

const getSettingsIconColor = (name: SettingsIconName) => {
  const dark = isDarkMode();

  const colors: Record<SettingsIconName, string> = {
    settings: dark ? '#FFFFFF' : '#5F6368',
    currency: dark ? '#7EE0A4' : '#0F9D58',
    language: dark ? '#FFD580' : '#F4B400',
    security: dark ? '#FF8E8E' : '#DB4437',
    network: dark ? '#82B1FF' : '#1A73E8',
    tools: dark ? '#D0BCFF' : '#673AB7',
    about: dark ? '#FFFFFF' : '#5F6368',
    privacy: dark ? '#FFFFFF' : '#000000',
    notifications: dark ? '#82B1FF' : '#1A73E8',
    lightning: dark ? '#FFD580' : '#F4B400',
    blockExplorer: dark ? '#82B1FF' : '#1A73E8',
    defaultView: dark ? '#FFFFFF' : '#5F6368',
    electrum: dark ? '#69F0AE' : '#0F9D58',
    licensing: dark ? '#FFFFFF' : '#24292e',
    releaseNotes: dark ? '#FFFFFF' : '#9AA0AA',
    selfTest: dark ? '#FFFFFF' : '#FC0D44',
    performance: dark ? '#FFFFFF' : '#FC0D44',
    github: dark ? '#FFFFFF' : '#24292e',
    x: dark ? '#FFFFFF' : '#1da1f2',
    twitter: dark ? '#FFFFFF' : '#1da1f2',
    telegram: dark ? '#FFFFFF' : '#0088cc',
    search: dark ? '#82B1FF' : '#1A73E8',
    paperPlane: dark ? '#82B1FF' : '#1A73E8',
    key: dark ? '#69F0AE' : '#0F9D58',
  };

  return colors[name] ?? platformColors.secondaryText;
};

const iosIconNameMap: Record<SettingsIconName, string> = {
  settings: 'settings-outline',
  currency: 'cash-outline',
  language: 'language-outline',
  security: 'shield-checkmark-outline',
  network: 'globe-outline',
  tools: 'construct-outline',
  about: 'information-circle-outline',
  privacy: 'lock-closed-outline',
  notifications: 'notifications-outline',
  lightning: 'flash-outline',
  blockExplorer: 'search-outline',
  defaultView: 'list-outline',
  electrum: 'server-outline',
  licensing: 'shield-checkmark-outline',
  releaseNotes: 'document-text-outline',
  selfTest: 'flask-outline',
  performance: 'speedometer-outline',
  github: 'logo-github',
  x: 'logo-twitter',
  twitter: 'logo-twitter',
  telegram: 'paper-plane-outline',
  search: 'search-outline',
  paperPlane: 'paper-plane-outline',
  key: 'key-outline',
};

const iosIconBackgroundMap: Partial<Record<SettingsIconName, string>> = {
  settings: 'rgba(142, 142, 147, 0.12)',
  currency: 'rgba(52, 199, 89, 0.12)',
  language: 'rgba(255, 149, 0, 0.12)',
  security: 'rgba(255, 59, 48, 0.12)',
  network: 'rgba(0, 122, 255, 0.12)',
  lightning: 'rgba(255, 149, 0, 0.12)',
  tools: 'rgba(142, 142, 147, 0.12)',
  about: 'rgba(142, 142, 147, 0.12)',
  privacy: 'rgba(142, 142, 147, 0.12)',
};

const androidIconNameMap: Record<SettingsIconName, string> = {
  settings: 'settings',
  currency: 'attach-money',
  language: 'language',
  security: 'security',
  network: 'public',
  tools: 'build',
  about: 'info',
  privacy: 'lock',
  notifications: 'notifications',
  lightning: 'flash-on',
  blockExplorer: 'search',
  defaultView: 'view-list',
  electrum: 'storage',
  licensing: 'verified-user',
  releaseNotes: 'description',
  selfTest: 'science',
  performance: 'speed',
  github: 'code',
  x: 'chat',
  twitter: 'chat',
  telegram: 'send',
  search: 'search',
  paperPlane: 'send',
  key: 'vpn-key',
};

const getIconProps = (name: SettingsIconName): PlatformListItemProps['leftIcon'] => {
  if (Platform.OS === 'ios') {
    return {
      name: iosIconNameMap[name] ?? 'settings-outline',
      type: 'ionicon',
      color: getSettingsIconColor(name),
      backgroundColor: iosIconBackgroundMap[name],
    };
  }

  return {
    name: androidIconNameMap[name] ?? 'settings',
    type: 'material',
    color: getSettingsIconColor(name),
  };
};

const getContainerStyle = (position: SettingsListItemPosition, spacingTop?: boolean) => {
  const isSingle = position === 'single';
  const isFirst = position === 'first' || isSingle;
  const isLast = position === 'last' || isSingle;

  return [
    styles.listItemContainer,
    styles.listItemNoGap,
    isAndroid && styles.listItemContainerAndroid,
    !isAndroid && isFirst && styles.listItemFirst,
    !isAndroid && isLast && styles.listItemLast,
    spacingTop && styles.listItemSpacingTop,
  ];
};

const getTextFromNode = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromNode).filter(Boolean).join(' ');
  }

  if (React.isValidElement(node)) {
    return getTextFromNode(node.props?.children);
  }

  return '';
};

export const SettingsListItem: React.FC<SettingsListItemProps> = props => {
  const { iconName, leftIcon, position = 'middle', spacingTop, accessibilityLabel, accessibilityHint, subtitle, title, ...rest } = props;
  const resolvedIcon = leftIcon ?? (iconName ? getIconProps(iconName) : undefined);
  const isSingle = position === 'single';
  const isLast = position === 'last' || isSingle;
  const resolvedAccessibilityHint = accessibilityHint ?? getTextFromNode(subtitle);
  const resolvedAccessibilityLabel = accessibilityLabel ?? title;

  return (
    <PlatformListItem
      {...rest}
      title={title}
      subtitle={subtitle}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityHint={resolvedAccessibilityHint || undefined}
      leftIcon={resolvedIcon}
      containerStyle={getContainerStyle(position, spacingTop)}
      bottomDivider={platformLayout.useBorderBottom && !isLast}
      isFirst={position === 'first' || isSingle}
      isLast={isLast}
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 0,
  },
  text: {
    color: platformColors.text,
    fontSize: platformSizing.titleFontSize,
  },
  subtitle: {
    color: platformColors.secondaryText,
    fontSize: platformSizing.subtitleFontSize,
    marginTop: isAndroid ? 5 : 2,
  },
  section: {
    marginTop: isAndroid ? 16 : 8,
    marginBottom: platformSizing.sectionSpacing / 2,
    marginHorizontal: isAndroid ? 0 : platformSizing.horizontalPadding,
  },
  sectionCompact: {
    marginTop: isAndroid ? 8 : 4,
    marginBottom: 8,
    marginHorizontal: isAndroid ? 0 : platformSizing.horizontalPadding,
  },
  sectionHeaderContainer: {
    marginTop: platformSizing.sectionSpacing,
    marginBottom: 8,
    paddingHorizontal: platformSizing.horizontalPadding,
  },
  sectionHeaderText: {
    fontSize: isAndroid ? platformSizing.subtitleFontSize : 13,
    fontWeight: isAndroid ? '500' : '400',
    color: platformColors.secondaryText,
  },
  card: {
    backgroundColor: isAndroid ? platformColors.background : platformColors.card,
    borderRadius: isAndroid ? 0 : platformSizing.cardBorderRadius,
    paddingHorizontal: isAndroid ? platformSizing.horizontalPadding : 0,
    paddingVertical: isAndroid ? platformSizing.verticalPadding : 0,
    overflow: isAndroid ? 'visible' : 'hidden',
    ...(isAndroid ? {} : { elevation: 1 }),
  },
  cardCompact: {
    paddingVertical: isAndroid ? platformSizing.verticalPadding : 0,
    paddingHorizontal: isAndroid ? platformSizing.horizontalPadding : 0,
  },
  listItemContainer: {
    backgroundColor: isAndroid ? platformColors.background : platformColors.card,
  },
  listItemNoGap: {
    marginVertical: 0,
  },
  listItemContainerAndroid: {
    minHeight: platformSizing.listItemMinHeight,
  },
  listItemFirst: {
    borderTopLeftRadius: platformSizing.cardBorderRadius * 1.5,
    borderTopRightRadius: platformSizing.cardBorderRadius * 1.5,
  },
  listItemLast: {
    borderBottomLeftRadius: platformSizing.cardBorderRadius * 1.5,
    borderBottomRightRadius: platformSizing.cardBorderRadius * 1.5,
  },
  listItemSpacingTop: {
    marginTop: isAndroid ? platformSizing.sectionSpacing : 12,
  },
});
