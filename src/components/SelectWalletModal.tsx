import React, { useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';
import { Overlay } from 'react-native-elements';
import { typography, palette } from 'styles';
import { WalletItemProps, WalletItem } from './WalletItem';
import { en } from 'locale';

interface Props {
  isVisible?: boolean;
  walletItems: WalletItemProps[];
}

export const SelectWalletModal = (props: Props) => {
  const [isVisible, setIsVisible] = useState(props.isVisible || false);
  const onBackdropPress = () => setIsVisible(false);

  const onWalletPress = (id: number) => {
    setIsVisible(false);
  };

  const renderWalletItems = () =>
    props.walletItems.map((item, key) => (
      <WalletItem
        variant={item.variant}
        value={item.value}
        name={item.name}
        title={item.title}
        selected={item.selected}
        key={key}
        onPress={onWalletPress}
      />
    ));

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={onBackdropPress}
      overlayStyle={styles.overlayStyle}
      width="100%"
      height={269}>
      <ScrollView style={styles.containerStyle}>
        <View style={styles.breakLine} />
        <Text style={styles.titleStyle}>{en.walletModal.wallets}</Text>
        <View style={styles.walletContainer}>{renderWalletItems()}</View>
      </ScrollView>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    marginHorizontal: 20,
  },
  overlayStyle: {
    bottom: 0,
    position: 'absolute',
    padding: 0,
    borderRadius: 8,
  },
  titleStyle: {
    ...typography.headline4,
    textAlign: 'center',
  },
  walletContainer: {
    marginTop: 31,
  },
  breakLine: {
    marginBottom: 13,
    marginTop: 16,
    height: 3,
    width: 36,
    backgroundColor: palette.grey,
    alignSelf: 'center',
  },
});
