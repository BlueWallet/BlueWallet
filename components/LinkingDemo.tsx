import React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import { useLinkTo } from '@react-navigation/native';

/**
 * A demo component showing how to manually trigger navigation using the
 * linking configuration with the useLinkTo hook.
 *
 * This is useful if you want to navigate programmatically using paths
 * defined in your linking configuration.
 */
const LinkingDemo: React.FC = () => {
  const linkTo = useLinkTo();

  const handleBitcoinDeepLink = () => {
    // This will navigate to the SendDetails screen with the URI as a parameter
    linkTo('/send/bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=0.001&label=Demo');
  };

  const handleLightningDeepLink = () => {
    // This will navigate to the ScanLNDInvoice screen with a Lightning URI as a parameter
    // Note: This is a fake/invalid invoice for demo purposes only
    linkTo('/lightning/lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yq');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Navigation 7 Linking Demo</Text>
      <Text style={styles.description}>This demonstrates how to manually navigate using paths defined in your linking configuration.</Text>

      <Button title="Navigate to SendDetails with Bitcoin Address" onPress={handleBitcoinDeepLink} />

      <View style={styles.buttonSpacer} />

      <Button title="Navigate to ScanLNDInvoice with Lightning Invoice" onPress={handleLightningDeepLink} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
  },
  buttonSpacer: {
    height: 16,
  },
});

export default LinkingDemo;
