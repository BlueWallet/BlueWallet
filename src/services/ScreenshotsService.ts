import { NativeModules } from 'react-native';

import { isIos } from 'app/styles/helpers';

export const preventScreenshots = () => {
  if (isIos()) return;
  return NativeModules.PreventScreenshotModule.forbid();
};

export const allowScreenshots = () => {
  if (isIos()) return;
  return NativeModules.PreventScreenshotModule.allow();
};
