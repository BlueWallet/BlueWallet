import { Platform, PlatformColor, OpaqueColorValue, Appearance } from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

export const getPlatformColor = (iosColor: string, androidColor: string): string | OpaqueColorValue => {
  return isIOS ? PlatformColor(iosColor) : androidColor;
};

let cachedColorScheme = Appearance.getColorScheme();

Appearance.addChangeListener(({ colorScheme }) => {
  cachedColorScheme = colorScheme;
});

export const isDarkMode = () => cachedColorScheme === 'dark';

export const platformColors = {
  get background() {
    if (isIOS) {
      return PlatformColor('systemGroupedBackground');
    }
    return isDarkMode() ? '#121212' : '#F8F9FA';
  },

  get card() {
    if (isIOS) {
      return PlatformColor('secondarySystemGroupedBackground');
    }
    return isDarkMode() ? '#1E1E1E' : '#FFFFFF';
  },

  get cardBackground() {
    return this.card;
  },

  get text() {
    if (isIOS) {
      return PlatformColor('label');
    }
    return isDarkMode() ? '#FFFFFF' : '#202124';
  },

  get titleColor() {
    return this.text;
  },

  get secondaryText() {
    if (isIOS) {
      return PlatformColor('secondaryLabel');
    }
    return isDarkMode() ? '#B3B3B3' : '#5F6368';
  },

  get subtitleColor() {
    return this.secondaryText;
  },

  get separator() {
    if (isIOS) {
      return PlatformColor('separator');
    }
    return isDarkMode() ? '#333333' : '#E0E0E0';
  },

  get separatorColor() {
    return this.separator;
  },

  get chevronColor() {
    return this.secondaryText;
  },

  get switchTrackColorFalse() {
    return isDarkMode() ? '#3E3E3E' : '#D1D1D6';
  },

  get switchTrackColorTrue() {
    return isDarkMode() ? '#4CD964' : '#34C759';
  },

  switchThumbColor(value: boolean) {
    if (value) {
      return isDarkMode() ? '#B2F5BF' : '#FFFFFF';
    }
    return isDarkMode() ? '#F4F4F4' : '#FFFFFF';
  },
};

export const platformSizing = {
  horizontalPadding: isIOS ? 16 : 20,
  verticalPadding: isIOS ? 12 : 8,
  sectionSpacing: isIOS ? 32 : 16,
  basePadding: 16,
  baseMargin: 16,
  contentContainerMarginHorizontal: isIOS ? 16 : 0,
  contentContainerPaddingHorizontal: isIOS ? 0 : 16,
  firstSectionContainerPaddingTop: isIOS ? 16 : 8,
  sectionContainerMarginBottom: isIOS ? 4 : 16,

  listItemMinHeight: isIOS ? 44 : 56,
  listItemPaddingVertical: isIOS ? 12 : 16,
  itemMinHeight: isIOS ? 44 : 56,

  cardBorderRadius: isIOS ? 10 : 4,
  iconBorderRadius: isIOS ? 6 : 0,
  containerBorderRadius: isIOS ? 10 : 4,
  iconContainerBorderRadius: isIOS ? 6 : 0,

  titleFontSize: isIOS ? 17 : 16,
  subtitleFontSize: isIOS ? 15 : 14,
  titleFontWeight: (isIOS ? '600' : '500') as '600' | '500',
  subtitleFontWeight: '400' as const,
  subtitlePaddingVertical: isIOS ? 2 : 2,
  subtitleLineHeight: isIOS ? 20 : 20,

  iconSize: isIOS ? 22 : 24,
  iconContainerSize: isIOS ? 28 : 24,
  iconInnerSize: isIOS ? 20 : 22,
  leftIconMarginLeft: 0,
  leftIconMarginRight: isIOS ? 12 : 12,
  leftIconWidth: isIOS ? 28 : 24,
  leftIconHeight: isIOS ? 28 : 24,
  containerPaddingVertical: isIOS ? 12 : 8,
  containerElevation: isIOS ? 0 : 2,
  containerMarginVertical: isIOS ? 4 : 0,
};

export const platformLayout = {
  useGroupedList: isIOS,
  showIconBackground: isIOS,
  showElevation: isAndroid,
  useBorderBottom: isIOS,
  useRippleEffect: isAndroid,
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
