import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Header, ScreenTemplate, Text, Mnemonic } from 'app/components';
import { MainCardStackNavigatorParams, Route, MainTabNavigatorParams } from 'app/consts';
import { preventScreenshots, allowScreenshots } from 'app/services/ScreenshotsService';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainCardStackNavigatorParams, Route.CreateWalletSuccess>,
    CompositeNavigationProp<
      StackNavigationProp<MainTabNavigatorParams, Route.Dashboard>,
      StackNavigationProp<MainCardStackNavigatorParams, Route.CreateWalletSuccess>
    >
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateWalletSuccess>;
  secret: string[];
}

export class CreateWalletSuccessScreen extends React.PureComponent<Props> {
  componentDidMount() {
    preventScreenshots();
  }

  componentWillUnmount() {
    allowScreenshots();
  }

  navigateBack = () => {
    this.props.navigation.navigate(Route.Dashboard);
  };

  render() {
    const {
      route: {
        params: { secret },
      },
    } = this.props;

    return (
      <ScreenTemplate
        footer={<Button onPress={this.navigateBack} title={i18n.wallets.addSuccess.okButton} />}
        header={<Header isBackArrow title={i18n.wallets.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.wallets.addSuccess.subtitle}</Text>
        <Text style={styles.description}>{i18n.wallets.addSuccess.description}</Text>
        <View style={styles.mnemonicPhraseContainer}>
          <Mnemonic mnemonic={secret} />
        </View>
      </ScreenTemplate>
    );
  }
}

export default CreateWalletSuccessScreen;

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 52,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  mnemonicPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
