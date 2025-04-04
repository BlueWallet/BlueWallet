import { DetailViewStackParamList } from './DetailViewStackParamList';

export type DrawerParamList = {
  DetailViewStackScreensStack: {
    screen?: keyof DetailViewStackParamList;
    params?: object;
  };
};
