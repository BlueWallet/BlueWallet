import React, { forwardRef } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import BlueText from './BlueText';
import ListItem, { ListItemProps } from './ListItem';
import SafeAreaScrollView from './SafeAreaScrollView';
import { useTheme } from './themes';

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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface IconConfig {
  name: IoniconsName;
  color: string;
  darkColor: string;
  backgroundColor: string;
}

const iconConfigs: Record<SettingsIconName, IconConfig> = {
  settings: { name: 'settings-outline', color: '#5F6368', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  currency: { name: 'cash-outline', color: '#0F9D58', darkColor: '#7EE0A4', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
  language: { name: 'language-outline', color: '#F4B400', darkColor: '#FFD580', backgroundColor: 'rgba(255, 149, 0, 0.12)' },
  security: { name: 'shield-checkmark-outline', color: '#DB4437', darkColor: '#FF8E8E', backgroundColor: 'rgba(255, 59, 48, 0.12)' },
  network: { name: 'globe-outline', color: '#1A73E8', darkColor: '#82B1FF', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
  tools: { name: 'construct-outline', color: '#673AB7', darkColor: '#D0BCFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  about: { name: 'information-circle-outline', color: '#5F6368', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  notifications: { name: 'notifications-outline', color: '#1A73E8', darkColor: '#82B1FF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  lightning: { name: 'flash-outline', color: '#F4B400', darkColor: '#FFD580', backgroundColor: 'rgba(255, 149, 0, 0.12)' },
  blockExplorer: { name: 'search-outline', color: '#1A73E8', darkColor: '#82B1FF', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
  electrum: { name: 'server-outline', color: '#0F9D58', darkColor: '#69F0AE', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
  licensing: { name: 'shield-checkmark-outline', color: '#24292e', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  releaseNotes: { name: 'document-text-outline', color: '#9AA0AA', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  selfTest: { name: 'flask-outline', color: '#FC0D44', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  performance: { name: 'speedometer-outline', color: '#FC0D44', darkColor: '#FFFFFF', backgroundColor: 'rgba(142, 142, 147, 0.12)' },
  github: { name: 'logo-github', color: '#24292e', darkColor: '#FFFFFF', backgroundColor: 'rgba(24, 23, 23, 0.1)' },
  search: { name: 'search-outline', color: '#1A73E8', darkColor: '#82B1FF', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
  paperPlane: { name: 'paper-plane-outline', color: '#1A73E8', darkColor: '#82B1FF', backgroundColor: 'rgba(0, 122, 255, 0.12)' },
  key: { name: 'key-outline', color: '#0F9D58', darkColor: '#69F0AE', backgroundColor: 'rgba(52, 199, 89, 0.12)' },
};

const SettingsIcon: React.FC<{ name: SettingsIconName }> = ({ name }) => {
  const { dark } = useTheme();
  const config = iconConfigs[name];
  return (
    <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]} importantForAccessibility="no">
      <Ionicons name={config.name} size={20} color={dark ? config.darkColor : config.color} />
    </View>
  );
};

export const SettingsListItem: React.FC<ListItemProps & { iconName?: SettingsIconName }> = ({
  iconName,
  containerStyle,
  leftAvatar,
  ...rest
}) => (
  <ListItem
    {...rest}
    containerStyle={[styles.transparentBackground, containerStyle]}
    leftAvatar={iconName ? <SettingsIcon name={iconName} /> : leftAvatar}
  />
);

// SafeAreaScrollView with the default top spacing settings screens use before their first section
export const SettingsScrollView = forwardRef<ScrollView, React.ComponentProps<typeof SafeAreaScrollView>>(
  ({ contentContainerStyle, ...rest }, ref) => (
    <SafeAreaScrollView ref={ref} {...rest} contentContainerStyle={[styles.scrollContent, contentContainerStyle]} />
  ),
);
SettingsScrollView.displayName = 'SettingsScrollView';

// Subdued explanation text used inside section bodies
export const SettingsFootnote: React.FC<TextProps> = ({ style, ...rest }) => {
  const { colors } = useTheme();
  return <Text style={[styles.footnote, { color: colors.alternativeTextColor }, style]} {...rest} />;
};

interface SettingsSectionProps {
  title?: string;
  headerRight?: React.ReactNode;
  onHeaderPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, headerRight, onHeaderPress, containerStyle, children }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    header: { backgroundColor: colors.cardSectionHeaderBackground },
    headerText: { color: colors.foregroundColor },
    body: { backgroundColor: colors.cardSectionBackground },
  });

  const header =
    title || headerRight ? (
      <View style={[styles.header, stylesHook.header]}>
        {title ? <BlueText style={[styles.headerText, stylesHook.headerText]}>{title}</BlueText> : null}
        {headerRight}
      </View>
    ) : null;

  return (
    <View style={[styles.card, containerStyle]}>
      {onHeaderPress && header ? (
        <Pressable accessibilityRole="button" onPress={onHeaderPress} style={({ pressed }) => (pressed ? styles.headerPressed : undefined)}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      <View style={stylesHook.body}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
  },
  footnote: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardContent: {
    padding: 16,
  },
  listCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 40,
    // SafeAreaFlatList injects bottom-inset padding into the content container; on a clipped,
    // background-colored card that padding shows as empty space inside the card, so cancel it
    paddingBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerPressed: {
    opacity: 0.75,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
});

// Shared styles for screens that build card content or FlatList-based cards themselves
export const settingsCardContent = styles.cardContent;
export const settingsListCard = styles.listCard;
export const settingsSectionHeader = styles.header;
export const settingsSectionHeaderText = styles.headerText;
