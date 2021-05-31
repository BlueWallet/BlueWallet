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
      fontWeight: 'bold',
      backgroundColor: colors.inputBackgroundColor,
    },
    inactiveTab: {
      fontWeight: 'normal',
      backgroundColor: colors.darkGray,
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

      return (
        <Text key={tab.key} onPress={() => changeToTab(tab.key)} style={[styles.tab, tabStyle]}>
          {tab.name}
        </Text>
      );
    });

    return (
      <View style={styles.container}>
        <View style={styles.tabs}>{tabsButtons}</View>
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
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tab: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 4,
    padding: 4,
  },
});

export { AddressTypeTabs };
