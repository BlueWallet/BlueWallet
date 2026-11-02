import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../components/themes';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';

type AppShortcutNavigation = NativeStackNavigationProp<DetailViewStackParamList, 'AppShortcut'>;
type AppShortcutRoute = RouteProp<DetailViewStackParamList, 'AppShortcut'>;

const AppShortcut = () => {
  const navigation = useNavigation<AppShortcutNavigation>();
  const { params } = useRoute<AppShortcutRoute>();
  const { colors } = useTheme();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Initial links hydrate navigation state without dispatching an action. Re-dispatch
    // the shortcut route so the navigation guard resolves it before any destination
    // screen is added to the stack.
    navigation.dispatch(CommonActions.navigate('AppShortcut', params));
  }, [navigation, params]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator />
    </View>
  );
};

export default AppShortcut;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
