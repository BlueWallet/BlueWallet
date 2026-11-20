import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ElectrumServerItem } from '../blue_modules/electrumServer';

type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;
type HeaderRightItems = NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>;

export type AddElectrumServerStackParamList = {
  AddElectrumServer: {
    onBarScanned?: string;
    server?: ElectrumServerItem;
    headerRight?: HeaderRightRenderer | null;
    unstable_headerRightItems?: HeaderRightItems;
  };
};
