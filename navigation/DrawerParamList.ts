import type { DetailViewStackParamList } from './DetailViewStackParamList';

// not NavigatorScreenParams: DetailViewStackParamList.DrawerRoot refers back here and TS rejects the cycle
export type DrawerParamList = {
  DetailViewStackScreensStack:
    | {
        screen?: keyof DetailViewStackParamList;
        params?: object;
      }
    | undefined;
};
