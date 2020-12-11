import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { images } from 'app/assets';
import { palette, typography } from 'app/styles';

import { Image } from './Image';
import { StyledText } from './StyledText';

const i18n = require('../../loc');

enum ImageVariant {
  Dashboard = 'dashboardNoWallet',
  ContactList = 'addressBookNoContacts',
  Authenticators = 'noAuthenticators',
}
interface Props {
  variant: ImageVariant;
  onPress: () => void;
  testID?: string;
}

export class ListEmptyState extends PureComponent<Props> {
  static Variant = ImageVariant;

  renderDashboardDescription = () => (
    <>
      <Text style={styles.description}>{i18n.wallets.dashboard.noWalletsDesc1}</Text>
      <Text style={styles.description}>
        <StyledText onPress={this.props.onPress} title={`${i18n._.click} `} />
        {i18n.wallets.dashboard.noWalletsDesc2}
      </Text>
    </>
  );

  renderAddressBookDescription = () => (
    <>
      <Text style={styles.description}>
        {i18n.contactList.noContactsDesc1}
        <StyledText onPress={this.props.onPress} title={` ${i18n._.here} `} />
        {i18n.contactList.noContactsDesc2}
      </Text>
    </>
  );

  renderAuthenticatorsDescription = () => (
    <>
      <Text style={styles.description}>
        {i18n.authenticators.list.noAuthenticatorsDesc1}
        <StyledText onPress={this.props.onPress} title={` ${i18n._.here} `} />
        {i18n.authenticators.list.noAuthenticatorsDesc2}
      </Text>
    </>
  );

  renderTitle() {
    const { variant } = this.props;

    switch (variant) {
      case ImageVariant.Dashboard:
        return i18n.wallets.dashboard.noWallets;
      case ImageVariant.ContactList:
        return i18n.contactList.noContacts;
      case ImageVariant.Authenticators:
        return i18n.authenticators.list.noAuthenticators;

      default:
        throw new Error(`Unsupported variant: ${variant}`);
    }
  }

  renderDescription() {
    const { variant } = this.props;

    switch (variant) {
      case ImageVariant.Dashboard:
        return this.renderDashboardDescription();
      case ImageVariant.ContactList:
        return this.renderAddressBookDescription();
      case ImageVariant.Authenticators:
        return this.renderAuthenticatorsDescription();
      default:
        throw new Error(`Unsupported variant: ${variant}`);
    }
  }

  render() {
    const { variant } = this.props;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.renderTitle()}</Text>
        <Image testID={this.props.testID} source={images[variant]} style={styles.image} resizeMode="contain" />
        {this.renderDescription()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  title: { ...typography.headline4 },
  image: {
    height: 172,
    width: '100%',
    marginTop: 40,
    marginBottom: 32,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
    color: palette.textGrey,
    lineHeight: 19,
  },
});
