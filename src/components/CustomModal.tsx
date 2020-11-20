import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';

interface Props {
  show: boolean;
  children: React.ReactNode;
}

export const CustomModal = ({ show, children }: Props) => {
  return (
    <View style={styles.container}>
      <Modal isVisible={show}>
        <View style={styles.wrapper}>{children}</View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: { flex: 1, justifyContent: 'center' },
});
