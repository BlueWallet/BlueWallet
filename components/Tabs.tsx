import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useTheme } from './themes';

const tabsStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: 50,
    borderColor: '#e3e3e3',
    borderBottomWidth: 1,
  },
  tabRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderBottomWidth: 2,
  },
  activeTabRoot: {
    borderColor: 'transparent',
    borderBottomWidth: 2,
  },
  marginBottom: {
    marginBottom: 30,
  },
});

interface TabProps {
  active: boolean;
}

interface TabsProps {
  active: number;
  onSwitch: (index: number) => void;
  tabs: React.ComponentType<TabProps>[];
  isIpad?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ active, onSwitch, tabs, isIpad = false }) => {
  const { colors } = useTheme();
  return (
    <View style={[tabsStyles.root, isIpad && tabsStyles.marginBottom]}>
      {tabs.map((Tab, i) => (
        <TouchableOpacity
          key={i}
          accessibilityRole="button"
          onPress={() => onSwitch(i)}
          style={[tabsStyles.tabRoot, active === i && { ...tabsStyles.activeTabRoot, borderColor: colors.buttonAlternativeTextColor }]}
        >
          <Tab active={active === i} />
        </TouchableOpacity>
      ))}
    </View>
  );
};
