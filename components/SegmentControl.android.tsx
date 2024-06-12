import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, UIManager, ViewStyle, TextStyle, Animated } from 'react-native';
import { useTheme } from './themes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SegmentedControlProps = {
  values: string[];
  selectedIndex: number;
  onChange: (selectedIndex: number) => void;
  style?: ViewStyle;
};

const SegmentedControl: React.FC<SegmentedControlProps> = ({ values, selectedIndex, onChange, style }) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: selectedIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, selectedIndex]);

  const stylesHook = StyleSheet.create({
    activeTab: {
      backgroundColor: colors.modal,
    } as ViewStyle,
    activeText: {
      fontWeight: 'bold',
      color: colors.foregroundColor,
    } as TextStyle,
    inactiveText: {
      fontWeight: 'normal',
      color: colors.foregroundColor,
    } as TextStyle,
    backTabs: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    } as ViewStyle,
  });

  const handleTabPress = (index: number) => {
    Animated.timing(animatedValue, {
      toValue: index,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onChange(index);
    });
  };

  const tabWidth = animatedValue.interpolate({
    inputRange: values.map((_, index) => index),
    outputRange: values.map(() => `${100 / values.length}%`),
  });

  const leftPosition = animatedValue.interpolate({
    inputRange: values.map((_, index) => index),
    outputRange: values.map((_, index) => `${(index * 100) / values.length}%`),
  });

  const render = () => {
    const tabsButtons = values.map((tab, index) => {
      const isActive = index === selectedIndex;

      const tabStyle = isActive ? stylesHook.activeTab : undefined;
      const textStyle = isActive ? stylesHook.activeText : stylesHook.inactiveText;

      return (
        <Pressable key={index} onPress={() => handleTabPress(index)} style={[styles.tab, tabStyle]}>
          <Text style={textStyle}>{tab}</Text>
        </Pressable>
      );
    });

    return (
      <View style={[styles.container, style]}>
        <View style={[stylesHook.backTabs, styles.backTabs]}>
          <Animated.View style={[styles.activeBackground, { left: leftPosition, width: tabWidth }]} />
          <View style={styles.tabs}>{tabsButtons}</View>
        </View>
      </View>
    );
  };

  return render();
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 18,
  } as ViewStyle,
  backTabs: {
    flex: 1,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 0.4,
  } as ViewStyle,
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  } as ViewStyle,
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  } as ViewStyle,
  activeBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  } as ViewStyle,
});

export default SegmentedControl;
