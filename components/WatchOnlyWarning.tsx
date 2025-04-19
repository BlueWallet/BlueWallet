import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';

import loc from '../loc';

interface Props {
  handleDismiss: () => void;
}

const WatchOnlyWarning: React.FC<Props> = ({ handleDismiss }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <FontAwesome6Icon name="close" color="white" size={20} />
        </TouchableOpacity>
        <FontAwesome6Icon name="warning" color="#FFFF" />
        <Text style={styles.title}>{loc.transactions.watchOnlyWarningTitle}</Text>
        <Text style={styles.description}>{loc.transactions.watchOnlyWarningDescription}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fc990e',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'black',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  description: {
    color: 'white',
    textAlign: 'center',
  },
});

export default WatchOnlyWarning;
