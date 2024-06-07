import React from 'react';
import { StyleSheet, Text, View, Pressable, LayoutAnimation, Platform, UIManager, ViewStyle, TextStyle } from 'react-native';
import loc from '../../loc';
import { useTheme } from '../themes';

export const TABS = {
  EXTERNAL: 'receive',
  INTERNAL: 'change',
} as const;

type TabKey = keyof typeof TABS;
type TABS_VALUES = (typeof TABS)[keyof typeof TABS];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AddressTypeTabsProps {
  currentTab: TABS_VALUES;
  setCurrentTab: (tab: TABS_VALUES) => void;
  customTabText?: { [key in TabKey]?: string };
}

const AddressTypeTabs: React.FC<AddressTypeTabsProps> = ({ currentTab, setCurrentTab, customTabText }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    activeTab: {
      backgroundColor: colors.modal,
    } as ViewStyle,
    activeText: {
      fontWeight: 'bold',
      color: colors.foregroundColor,
    } as TextStyle,
    inactiveTab: {
      fontWeight: 'normal',
      color: colors.foregroundColor,
    } as TextStyle,
    backTabs: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    } as ViewStyle,
  });

  const tabs = Object.entries(TABS).map(([key, value]) => {
    return {
      key: key as TabKey,
      value,
      name: customTabText?.[key as TabKey] || loc.addresses[`type_${value}`],
    };
  });

  const changeToTab = (tabKey: TabKey) => {
    if (tabKey in TABS) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentTab(TABS[tabKey]);
    }
  };

  const render = () => {
    const tabsButtons = tabs.map(tab => {
      const isActive = tab.value === currentTab;

      const tabStyle = isActive ? stylesHook.activeTab : undefined;
      const textStyle = isActive ? stylesHook.activeText : stylesHook.inactiveTab;

      return (
        <Pressable key={tab.key} onPress={() => changeToTab(tab.key)} style={[styles.tab, tabStyle]}>
          <Text style={textStyle}>{tab.name}</Text>
        </Pressable>
      );
    });

    return (
      <View style={styles.container}>
        <View style={[stylesHook.backTabs, styles.backTabs]}>
          <View style={styles.tabs}>{tabsButtons}</View>
        </View>
      </View>
    );
  };

  return render();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  } as ViewStyle,
  backTabs: {
    padding: 4,
    marginVertical: 8,
    borderRadius: 8,
  } as ViewStyle,
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  } as ViewStyle,
  tab: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  } as ViewStyle,
});

export { AddressTypeTabs };
