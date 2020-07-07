import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Header, ScreenTemplate, Text, Chip } from 'app/components';
import { MainCardStackNavigatorParams, Route } from 'app/consts';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.CreateWallet>;
  secret: string[];
}

export class CreateWalletSuccessScreen extends React.PureComponent<Props> {
  navigateBack = () => {
    this.props.navigation.popToTop();
  };

  render() {
    return (
      <ScreenTemplate
        footer={<Button onPress={this.navigateBack} title={i18n.wallets.addSuccess.okButton} />}
        header={<Header isBackArrow navigation={this.props.navigation} title={i18n.wallets.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.wallets.addSuccess.subtitle}</Text>
        <Text style={styles.description}>{i18n.wallets.addSuccess.description}</Text>
        <View style={styles.mnemonicPhraseContainer}>
          {this.props.secret.map((secret, index) => (
            <Chip key={index.toString()} label={`${index + 1}. ${secret}`} />
          ))}
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
