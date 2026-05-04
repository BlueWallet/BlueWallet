import React from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet, useColorScheme } from 'react-native';
import Icon from './Icon';
import loc from '../loc';

interface Props {
  handleDismiss: () => void;
}

const WatchOnlyWarning: React.FC<Props> = ({ handleDismiss }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <View style={styles.header}>
        <Icon name="warning" color="#FFFFFF" size={20} />
        <Text style={styles.title} numberOfLines={1}>
          {loc.transactions.watchOnlyWarningTitle}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={loc._.close}
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={require('../img/close-white.png')} style={styles.dismissIcon} />
        </TouchableOpacity>
      </View>
      <Text style={styles.description}>{loc.transactions.watchOnlyWarningDescription}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  containerLight: {
    backgroundColor: '#fc990e',
  },
  containerDark: {
    backgroundColor: '#7e4a05',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    textAlign: 'left',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dismissIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  description: {
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 20,
    fontWeight: '600',
  },
});

export default WatchOnlyWarning;
