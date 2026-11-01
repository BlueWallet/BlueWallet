import type { RootParamList as AppRootParamList } from '../navigation/RootParamList';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AppRootParamList {}
  }
}

export {};
