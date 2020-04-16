import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { images } from 'app/assets';
import { en } from 'app/locale';
import { typography, palette } from 'app/styles';

import { Image } from './Image';
import { StyledText } from './StyledText';

enum ImageVariant {
  Dashboard = 'dashboardNoWallet',
  AddressBook = 'addressBookNoContacts',
}
interface Props {
  variant: ImageVariant;
  onPress: () => void;
}

export class ListEmptyState extends PureComponent<Props> {
  static Variant = ImageVariant;

  renderDashboardDescription = () => (
    <>
      <Text style={styles.description}>{en.dashboard.noWalletsDesc1}</Text>
      <Text style={styles.description}>
        <StyledText onPress={this.props.onPress} title="Click" /> {en.dashboard.noWalletsDesc2}
      </Text>
    </>
  );

  renderAddressBookDescription = () => (
    <>
      <Text style={styles.description}>
        {en.addressBook.noContactsDesc1}
        <StyledText onPress={this.props.onPress} title="here" />
        {en.addressBook.noContactsDesc2}
      </Text>
    </>
  );

  render() {
    const { variant } = this.props;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {variant == ImageVariant.Dashboard ? en.dashboard.noWallets : en.addressBook.noContacts}
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
    lineHeight: 19,
  },
  link: {
    ...typography.headline5,
    color: palette.textSecondary,
  },
});
