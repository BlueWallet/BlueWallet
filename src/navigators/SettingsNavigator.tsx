import { createStackNavigator } from 'react-navigation';

import { Route } from 'app/consts';
import {
  SettingsScreen,
  SelectLanguageScreen,
  AboutUsScreen,
  ElectrumServerScreen,
  AdvancedOptionsScreen,
} from 'app/screens';

export const SettingsNavigator = createStackNavigator({
  [Route.Settings]: SettingsScreen,
  [Route.SelectLanguage]: SelectLanguageScreen,
  [Route.AboutUs]: AboutUsScreen,
  [Route.AdvancedOptions]: AdvancedOptionsScreen,
  [Route.ElectrumServer]: ElectrumServerScreen,
});
