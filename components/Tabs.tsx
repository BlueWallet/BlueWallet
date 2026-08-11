import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from './themes';

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
  const [rootWidth, setRootWidth] = useState(0);
  const tabWidth = tabs.length > 0 ? rootWidth / tabs.length : 0;

  const onLayout = (e: LayoutChangeEvent) => setRootWidth(e.nativeEvent.layout.width);

  const underlineStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: withTiming(active * tabWidth, { duration: 250 }) }],
    }),
    [active, tabWidth],
  );

  return (
    <View style={[tabsStyles.root, isIpad && tabsStyles.marginBottom]} onLayout={onLayout}>
      {tabs.map((Tab, i) => (
        <TouchableOpacity key={i} accessibilityRole="button" testID={`Tab${i}`} onPress={() => onSwitch(i)} style={tabsStyles.tabRoot}>
          <Tab active={active === i} />
        </TouchableOpacity>
      ))}
      {tabWidth > 0 && (
        <Animated.View
          style={[tabsStyles.underline, { width: tabWidth, backgroundColor: colors.buttonAlternativeTextColor }, underlineStyle]}
        />
      )}
    </View>
  );
};

const tabsStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: 50,
  },
  tabRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
  marginBottom: {
    marginBottom: 30,
  },
});
