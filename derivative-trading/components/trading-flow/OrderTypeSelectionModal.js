import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { BlueTextCentered } from '../../../BlueComponents';
import { OrderType } from '../../models/TradingTypes';
import { ListItem } from 'react-native-elements';
import { BlueCurrentTheme } from '../../../components/themes';

const OrderTypeSelectionModal = ({ onOrderTypeSelected }) => {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
      <View style={styles.modalContent}>
        <BlueTextCentered>Select an order type.</BlueTextCentered>
        <View style={styles.modelContentListContainer}>
          <ListItem title="Market" bottomDivider onPress={() => onOrderTypeSelected(OrderType.MARKET)} />
          <ListItem title="Limit" onPress={() => onOrderTypeSelected(OrderType.LIMIT)} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },

  modelContentListContainer: {
    flexDirection: 'column',
    marginTop: 16,
    justifyContent: 'flex-start',
  },
});

OrderTypeSelectionModal.propTypes = {
  onOrderTypeSelected: PropTypes.func.isRequired,
};

export default OrderTypeSelectionModal;
