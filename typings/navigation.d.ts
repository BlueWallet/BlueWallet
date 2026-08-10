import type { ParamListBase } from '@react-navigation/native';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends ParamListBase {}
  }
}

export {};
