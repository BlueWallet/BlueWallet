import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type SelectWalletOptionsContext = {
  route: { key: string; params?: { hasSelectableWallets?: boolean } };
  navigation: { getState: () => { routes: { key: string }[] } };
};

export const getSelectWalletOptions = (
  options: NativeStackNavigationOptions,
  { route, navigation }: SelectWalletOptionsContext,
): NativeStackNavigationOptions => ({
  ...options,
  statusBarStyle: route.params?.hasSelectableWallets ? 'auto' : 'light',
  headerBackVisible: navigation.getState().routes.findIndex(item => item.key === route.key) > 0,
});
