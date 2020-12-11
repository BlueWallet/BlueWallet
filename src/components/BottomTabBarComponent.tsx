import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';

import { images } from 'app/assets';
import { palette, typography } from 'app/styles';
import { ifIphoneX } from 'app/styles/helpers';

import { BottomTabBarIcon } from './BottomTabBarIcon';
import { GradientView } from './GradientView';

export const BottomTabBarComponent = ({ state, descriptors, navigation }: BottomTabBarProps) => (
  <GradientView variant={GradientView.Variant.Primary}>
    <View style={styles.buttonsContainer}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <TouchableOpacity
            key={index}
            testID={`navigation-tab-${index}`}
            style={styles.button}
            onPress={onPress}
            activeOpacity={0.5}
          >
            <BottomTabBarIcon source={isFocused ? images[route.name] : images[`${route.name}Inactive`]} />
            <Text style={{ ...typography.subtitle2, color: isFocused ? palette.secondary : palette.textWhiteMuted }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </GradientView>
);

const styles = StyleSheet.create({
  button: { alignItems: 'center' },
  buttonsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: ifIphoneX(50, 16) },
});
