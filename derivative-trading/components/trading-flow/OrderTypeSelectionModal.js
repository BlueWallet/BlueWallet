import PropTypes from 'prop-types';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { ListItem } from 'react-native-elements';
import { BlueTextCentered } from '../../../BlueComponents';
import { BlueCurrentTheme } from '../../../components/themes';
import { OrderType } from '../../models/TradingTypes';

const OrderTypeSelectionModal = ({ onOrderTypeSelected }) => {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
      <View style={styles.modalContent}>
        <BlueTextCentered>Select an order type.</BlueTextCentered>
        <View style={styles.modelContentListContainer}>
          <ListItem bottomDivider onPress={() => onOrderTypeSelected(OrderType.MARKET)}>
            <ListItem.Title>Market</ListItem.Title>
          </ListItem>
          <ListItem onPress={() => onOrderTypeSelected(OrderType.LIMIT)}>
            <ListItem.Title>Limit</ListItem.Title>
          </ListItem>
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
