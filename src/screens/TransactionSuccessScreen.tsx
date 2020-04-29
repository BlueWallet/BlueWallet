import React from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { Button, Text, Image } from 'app/components';
import { Route } from 'app/consts';
import i18n from 'app/locale';
import { palette, typography } from 'app/styles';

export class TransactionSuccessScreen extends React.PureComponent<NavigationInjectedProps> {
  navigateBack = () => this.props.navigation.navigate(Route.Dashboard);
  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{i18n.send.success.title}</Text>
          <Image source={images.success} style={styles.icon} />
          <Text style={styles.description}>{i18n.send.success.description}</Text>
        </View>
        <Button style={styles.button} onPress={this.navigateBack} title={i18n.send.success.return} />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 50,
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: palette.white,
  },
  content: {
    marginVertical: 100,
    alignItems: 'center',
    height: '50%',
    justifyContent: 'space-between',
  },
  title: {
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
  button: { marginHorizontal: 20 },
  icon: {
    marginVertical: 40,
    width: 172,
    height: 172,
  },
});
