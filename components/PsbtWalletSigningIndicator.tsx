import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import loc from '../loc';
import Icon from './Icon';
import { useTheme } from './themes';

const PsbtWalletSigningIndicator = ({ wallet }: { wallet: TWallet }) => {
  const { colors } = useTheme();
  const multisig = wallet.type === MultisigHDWallet.type ? (wallet as MultisigHDWallet) : undefined;
  const localKeys = multisig
    ? multisig.howManySignaturesCanWeMake()
    : wallet.type !== WatchOnlyWallet.type && wallet.chain === Chain.ONCHAIN
      ? 1
      : 0;
  const hasSigningKeys = localKeys > 0;
  const label = hasSigningKeys ? loc.send.psbt_local_signing_keys : loc.send.psbt_linked_wallet;
  const details = multisig
    ? loc.formatString(loc.send.psbt_multisig_signing_keys, { available: localKeys, required: multisig.getM() })
    : undefined;

  return (
    <View accessible accessibilityLabel={[label, details].filter(Boolean).join('. ')} style={styles.container}>
      <Icon name={hasSigningKeys ? 'key' : 'link'} size={20} color={colors.alternativeTextColor} />
      <Text style={[styles.label, { color: colors.alternativeTextColor }]}>{label}</Text>
      {details && <Text style={[styles.label, { color: colors.alternativeTextColor }]}>{details}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    maxWidth: 130,
    marginStart: 8,
    gap: 4,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PsbtWalletSigningIndicator;
