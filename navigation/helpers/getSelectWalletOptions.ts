import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import navigationStyle from '../../components/navigationStyle';
import type { Theme } from '../../components/themes';

export const getSelectWalletOptions =
  (theme: Theme, title: string) =>
  ({ route, navigation }: any): NativeStackNavigationOptions =>
    navigationStyle(
      {
        title,
        statusBarStyle: route.params?.isLoading || route.params?.isEmpty ? 'light' : 'auto',
        headerBackVisible: navigation.getState().routes.length > 1 ? undefined : false,
      },
      undefined,
    )(theme);
