import React from 'react';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { useRoute } from '@react-navigation/native';

const HodlHodlWebview = () => {
  const { uri } = useRoute().params;

  return (
    <SafeBlueArea>
      <WebView source={{ uri }} incognito />
    </SafeBlueArea>
  );
};

HodlHodlWebview.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      uri: PropTypes.string.isRequired,
    }),
  }),
};

export default HodlHodlWebview;

HodlHodlWebview.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: '',
  headerLeft: null,
});
