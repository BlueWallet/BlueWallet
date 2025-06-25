import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { initializeNotifications } from '../blue_modules/notifications';
import { processAllNotifications } from '../navigation/LinkingConfig';
import { useStorage } from './context/useStorage';

/**
 * Hook that initializes the notification system independently
 * This handles all notification processing through LinkingConfig
 */
const useNotificationSystem = () => {
  const { wallets, walletsInitialized, refreshAllWalletTransactions } = useStorage();
  const navigation = useNavigation();

  useEffect(() => {
    // Create a notification processing callback that uses LinkingConfig
    const processNotificationCallback = async () => {
      // Only process notifications when wallets are initialized
      if (!walletsInitialized) {
        console.log('🔔 Wallets not initialized yet, notification will be stored and processed later');
        return false;
      }

      try {
        const didNavigate = await processAllNotifications();
        return didNavigate;
      } catch (error) {
        console.error('Failed to process notifications:', error);
        return false;
      }
    };

    // Initialize notifications with our callback
    initializeNotifications(processNotificationCallback);
  }, [walletsInitialized, wallets, navigation, refreshAllWalletTransactions]);

  // Process any pending notifications when wallets become initialized
  useEffect(() => {
    if (walletsInitialized && wallets.length >= 0) {
      console.log('🔔 Wallets initialized, processing any pending notifications');
      // Small delay to ensure everything is properly set up
      setTimeout(async () => {
        try {
          await processAllNotifications();
        } catch (error) {
          console.error('Failed to process pending notifications:', error);
        }
      }, 1000);
    }
  }, [walletsInitialized, wallets, navigation, refreshAllWalletTransactions]);
};

export default useNotificationSystem;
