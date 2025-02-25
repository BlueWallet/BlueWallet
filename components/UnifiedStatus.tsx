import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface BlockInfo {
  height: number;
  time: number;
  timestamp?: number;
  confirmations?: number;
}

// Update props interface to match BlockData
interface ElectrumServerDataProps {
  blueStatus: string;
  blockHeight: number | string;
  blockTime: number | string;
  timestamp?: number;
  isSubscribed: boolean;
}

// Add helper function for time formatting
const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'any moment now';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `~${minutes}m ${Math.round(seconds % 60)}s`;
};

// Update average block time to be more accurate
const AVERAGE_BLOCK_TIME = 10 * 60; // Exactly 10 minutes in seconds

// Update component to display timestamp if available
export const ElectrumServerData: React.FC<ElectrumServerDataProps> = ({ blueStatus, blockHeight, blockTime, timestamp, isSubscribed }) => {
  const [nextBlockTime, setNextBlockTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof blockTime === 'number') {
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastBlock = now - blockTime;
        const timeRemaining = AVERAGE_BLOCK_TIME - (timeSinceLastBlock % AVERAGE_BLOCK_TIME);

        // Don't show extremely long times - if we're past the expected time, show "any moment"
        if (timeSinceLastBlock > AVERAGE_BLOCK_TIME) {
          setNextBlockTime('any moment now');
        } else {
          setNextBlockTime(formatTimeRemaining(timeRemaining));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [blockTime]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Electrum Server Data</Text>
      <Text>Connection Status: {blueStatus}</Text>
      <Text>Latest Block: {blockHeight}</Text>
      {typeof blockTime === 'number' ? (
        <>
          <Text>Block Time: {new Date(blockTime * 1000).toLocaleString()}</Text>
          <Text style={styles.nextBlock}>Next block expected in: {nextBlockTime}</Text>
          {timestamp && timestamp !== blockTime && (
            <Text style={styles.timestamp}>Fetched: {new Date(timestamp * 1000).toLocaleString()}</Text>
          )}
        </>
      ) : (
        <Text style={styles.error}>Block Time: {blockTime}</Text>
      )}
      <Text>Subscribed: {isSubscribed ? 'Yes' : 'No'}</Text>
      {!isSubscribed && <Text style={styles.error}>Not subscribed: no block updates received from server.</Text>}
    </View>
  );
};

// Update interface to include error
interface WebhookDataProps {
  blockchairStatus: string;
  lastBlock: {
    height: number | string;
    time: string;
  };
  error?: string | null;
}

export const WebhookData: React.FC<WebhookDataProps> = ({ blockchairStatus, lastBlock, error }) => (
  <View style={styles.section}>
    <Text style={styles.title}>Blockchair Data</Text>
    <Text>Status: {blockchairStatus}</Text>
    <Text>Latest Block: {lastBlock.height}</Text>
    <Text>Block Time: {lastBlock.time}</Text>
    {blockchairStatus === 'Error' && (
      <View>
        <Text style={styles.error}>Unable to fetch data from Blockchair</Text>
        {error && <Text style={styles.errorDetail}>Retrying... ({error})</Text>}
      </View>
    )}
  </View>
);

// Update interface to include transaction changes
interface StorageStatusProps {
  lastStorageBlock: number | string;
  storageUpdated: string;
  updatedWallets?: Array<{
    label: string;
    confirmedTxs?: number;
    newTxs?: number;
  }>;
}

export const StorageStatus: React.FC<StorageStatusProps> = ({ lastStorageBlock, storageUpdated, updatedWallets }) => (
  <View style={styles.section}>
    <Text style={styles.title}>Storage Data</Text>
    <Text>Latest Stored Block: {lastStorageBlock}</Text>
    <Text>Last Updated: {storageUpdated}</Text>

    {updatedWallets && updatedWallets.length > 0 ? (
      <>
        <Text style={styles.subtitle}>Updated Wallets:</Text>
        {updatedWallets.map((wallet, i) => (
          <View key={i} style={styles.updateRow}>
            <Text style={styles.walletLabel}>{wallet.label}:</Text>
            {wallet.confirmedTxs ? <Text style={styles.update}>{wallet.confirmedTxs} transactions confirmed</Text> : null}
            {wallet.newTxs ? <Text style={styles.update}>{wallet.newTxs} new transactions</Text> : null}
          </View>
        ))}
      </>
    ) : (
      <Text style={styles.noUpdates}>No transaction updates</Text>
    )}
  </View>
);

interface LastUpdateProps {
  lastUpdateTimestamp: string;
}

export const LastUpdate: React.FC<LastUpdateProps> = ({ lastUpdateTimestamp }) => (
  <View style={styles.section}>
    <Text style={styles.title}>Last Update Timestamp</Text>
    <Text>{lastUpdateTimestamp}</Text>
  </View>
);

export interface UnifiedStatusProps {
  serverProps: ElectrumServerDataProps;
  webhookProps: WebhookDataProps;
  storageProps: StorageStatusProps;
  lastUpdateTimestamp: string;
}

export const UnifiedStatus: React.FC<UnifiedStatusProps> = ({ serverProps, webhookProps, storageProps, lastUpdateTimestamp }) => (
  <View style={styles.container}>
    <ElectrumServerData {...serverProps} />
    <WebhookData {...webhookProps} />
    <StorageStatus {...storageProps} />
    <LastUpdate lastUpdateTimestamp={lastUpdateTimestamp} />
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 4 },
  section: { marginBottom: 12 },
  title: { fontWeight: 'bold', marginBottom: 4, fontSize: 16 },
  error: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 4,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  updateRow: {
    marginLeft: 8,
    marginTop: 4,
  },
  walletLabel: {
    fontWeight: '500',
  },
  update: {
    color: '#0070ff',
    fontSize: 12,
    marginLeft: 8,
  },
  noUpdates: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorDetail: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  nextBlock: {
    color: '#0070ff',
    fontSize: 12,
    marginTop: 2,
  },
});
