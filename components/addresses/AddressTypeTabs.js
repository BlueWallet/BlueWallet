import { useTheme } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import loc from '../../loc';

export const TABS = {
  EXTERNAL: 'receive',
  INTERNAL: 'change',
};

const AddressTypeTabs = ({ currentTab, setCurrentTab }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    activeTab: {
      backgroundColor: colors.modal,
    },
    activeText: {
      fontWeight: 'bold',
      color: colors.foregroundColor,
    },
    inactiveTab: {
      fontWeight: 'normal',
      color: colors.foregroundColor,
    },
    backTabs: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  const tabs = Object.entries(TABS).map(([key, value]) => {
    return {
      key,
      value,
      name: loc.addresses[`type_${value}`],
    };
  });

  const changeToTab = tabKey => {
    if (tabKey in TABS) {
      setCurrentTab(TABS[tabKey]);
    }
  };

  const render = () => {
    const tabsButtons = tabs.map(tab => {
      const isActive = tab.value === currentTab;

      const tabStyle = isActive ? stylesHook.activeTab : stylesHook.inactiveTab;
      const textStyle = isActive ? stylesHook.activeText : stylesHook.inactiveTab;

      return (
        <View key={tab.key} onPress={() => changeToTab(tab.key)} style={[styles.tab, tabStyle]}>
          <Text onPress={() => changeToTab(tab.key)} style={textStyle}>
            {tab.name}
          </Text>
        </View>
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
  },
  backTabs: {
    padding: 4,
    marginVertical: 8,
    borderRadius: 8,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tab: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});

export { AddressTypeTabs };
