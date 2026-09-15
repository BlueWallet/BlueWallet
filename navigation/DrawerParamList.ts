import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DetailViewStackParamList } from './DetailViewStackParamList';

export type DrawerParamList = {
  DetailViewStackScreensStack: NavigatorScreenParams<DetailViewStackParamList>;
};
