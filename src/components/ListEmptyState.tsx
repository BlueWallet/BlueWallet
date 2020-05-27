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
}
interface Props {
  variant: ImageVariant;
  onPress: () => void;
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

  render() {
    const { variant } = this.props;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {variant == ImageVariant.Dashboard ? i18n.wallets.dashboard.noWallets : i18n.contactList.noContacts}
        </Text>
        <Image source={images[variant]} style={styles.image} resizeMode="contain" />
        {variant == ImageVariant.Dashboard ? this.renderDashboardDescription() : this.renderAddressBookDescription()}
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
