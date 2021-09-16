import React from 'react';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';

import { SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';

const HodlHodlWebview = () => {
  const { uri } = useRoute().params;

  return (
    <SafeBlueArea>
      <WebView source={{ uri }} incognito />
    </SafeBlueArea>
  );
};

HodlHodlWebview.navigationOptions = navigationStyle({
  closeButton: true,
  title: '',
  headerHideBackButton: true,
});

export default HodlHodlWebview;
