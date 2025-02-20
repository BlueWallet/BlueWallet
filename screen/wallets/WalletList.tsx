import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStorage } from '../../hooks/context/useStorage';

const WalletList = () => {
  const { wallets } = useStorage();
  return (
    <View style={styles.container}>
      {wallets.map(wallet => (
        <Text key={wallet.getID()}>{wallet.getLabel()}</Text>
      ))}
    </View>
  );
};

export default WalletList;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
