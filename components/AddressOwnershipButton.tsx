// components/AddressOwnershipButton.tsx

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Text,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons'; // Using Ionicons for icons
import { TWallet } from '../class/wallets/types';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import WalletGradient from '../class/wallet-gradient';
import { BlueButtonLink } from '../BlueComponents';
import { validateBitcoinAddress, getWalletsByAddress } from '../helpers/addressOwnershipValidation';

interface AddressOwnershipButtonProps {
  address: string;
  wallets: TWallet[];
  onPress?: (wallet: TWallet) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * AddressOwnershipButton Component
 *
 * Validates the provided Bitcoin address and determines which wallets own it.
 * Displays ownership information with a header and accordion functionality for multiple wallets.
 *
 * @param {AddressOwnershipButtonProps} props - The props for the component.
 * @returns {JSX.Element | null} The rendered component or null if no wallets own the address.
 */
const AddressOwnershipButton: React.FC<AddressOwnershipButtonProps> = ({
  address,
  wallets,
  onPress,
  style,
}) => {
  const navigation = useNavigation<NavigationProp<DetailViewStackParamList>>();
  const [owningWallets, setOwningWallets] = useState<TWallet[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    // Validate the address and determine owning wallets
    const valid = validateBitcoinAddress(address);
    setIsValid(valid);
    if (valid) {
      const owners = getWalletsByAddress(address, wallets);
      setOwningWallets(owners);
    } else {
      setOwningWallets([]);
    }
    // Reset expansion when address changes
    setIsExpanded(false);
  }, [address, wallets]);

  /**
   * Handles the wallet button press.
   * Navigates to WalletTransactions screen or uses a custom handler.
   *
   * @param {TWallet} wallet - The wallet associated with the button.
   */
  const handlePress = (wallet: TWallet) => {
    if (onPress) {
      onPress(wallet);
    } else {
      navigation.navigate('WalletTransactions', {
        walletID: wallet.getID(),
        walletType: wallet.type,
      });
    }
  };

  /**
   * Toggles the expanded state with animation.
   */
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(prev => !prev);
  };

  if (!isValid) {
    // Optionally, you can display a message or nothing if the address is invalid
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.invalidText}>Invalid Bitcoin address.</Text>
      </View>
    );
  }

  if (owningWallets.length === 0) {
    // Optionally, inform the user that no wallets own this address
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noOwnershipText}>No wallets own this address.</Text>
      </View>
    );
  }

  /**
   * Renders an individual wallet button.
   *
   * @param {TWallet} wallet - The wallet to render.
   * @returns {JSX.Element} The rendered wallet button.
   */
  const renderWalletButton = (wallet: TWallet) => {
    const gradientColors = WalletGradient.gradientsFor(wallet.type);
    return (
      <LinearGradient
        key={wallet.getID()}
        colors={gradientColors}
        style={styles.gradientButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <BlueButtonLink
          title={`View ${wallet.getLabel()}`}
          onPress={() => handlePress(wallet)}
          style={styles.buttonText}
          textStyle={styles.textStyle}
        />
      </LinearGradient>
    );
  };

  /**
   * Determines which wallets to display based on the expanded state.
   */
  const displayedWallets = isExpanded ? owningWallets : owningWallets.slice(0, 1);
  const remainingCount = owningWallets.length - displayedWallets.length;

  return (
    <View style={[styles.container, style]}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerText}>The address is owned by:</Text>
        {/* Accordion Button */}
        {owningWallets.length > 1 && (
          <TouchableOpacity
            style={styles.accordionButton}
            onPress={toggleExpanded}
            activeOpacity={0.7}
            accessibilityLabel={isExpanded ? 'Show less wallets' : `Show ${remainingCount} more wallets`}
            accessibilityHint="Tap to expand or collapse the list of wallets owning this address"
          >
            <Text style={styles.accordionText}>{isExpanded ? 'Show less' : `and ${remainingCount} more...`}</Text>
            <Icon
              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color="#555"
              style={styles.icon}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Wallet Buttons */}
      <View style={styles.walletsContainer}>
        {displayedWallets.map(wallet => renderWalletButton(wallet))}
      </View>
    </View>
  );
};

export default AddressOwnershipButton;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  accordionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
    fontWeight: '500',
  },
  icon: {
    marginLeft: 2,
  },
  walletsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  gradientButton: {
    borderRadius: 20,
    marginVertical: 5,
    width: '90%', // Adjust width as needed
    overflow: 'hidden',
    elevation: 2, // Adds shadow for Android
    shadowColor: '#000', // Adds shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  textStyle: {
    color: '#FFFFFF',
    fontWeight: '600', // Improved font weight
    fontSize: 16, // Larger font size for better readability
  },
  invalidText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  noOwnershipText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
});