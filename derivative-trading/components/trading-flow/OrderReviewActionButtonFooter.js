import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-elements';
import { BlueCurrentTheme } from '../../../components/themes';

const OrderReviewActionButtonFooter = ({ onCancel, onConfirm, height, style, cancelButtonStyles, confirmButtonStyles, canConfirm }) => {
  const customStyles = { height, ...style };
  const cancelButtonTitleStyle = {
    color: cancelButtonStyles.color || styles.cancelButton.color,
  };
  const confirmButtonTitleStyle = {
    color: confirmButtonStyles.color || styles.confirmButton.color,
  };

  return (
    <View style={{ ...styles.actionButtonFooterContainer, ...customStyles }}>
      <Button
        title="Cancel"
        onPress={onCancel}
        containerStyle={[styles.footerActionButtonContainer]}
        buttonStyle={[styles.footerActionButton, styles.cancelButton, cancelButtonStyles]}
        titleStyle={cancelButtonTitleStyle}
      />
      <Button
        title="Confirm"
        onPress={onConfirm}
        disabled={!canConfirm}
        containerStyle={[styles.footerActionButtonContainer, styles.confirmButton]}
        buttonStyle={[styles.footerActionButton, styles.confirmButton, confirmButtonStyles]}
        titleStyle={confirmButtonTitleStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BlueCurrentTheme.colors.cta2,
    flexDirection: 'row',
  },

  footerActionButtonContainer: {
    flexBasis: '50%',
    borderRadius: 0,
  },

  footerActionButton: {
    height: '100%',
    borderRadius: 0,
  },

  cancelButton: {
    backgroundColor: '#C6C6C6',
    color: '#0A0A0A',
  },

  confirmButton: {
    backgroundColor: BlueCurrentTheme.colors.buttonBlueBackgroundColor,
    color: BlueCurrentTheme.colors.buttonTextColor,
  },
});

OrderReviewActionButtonFooter.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  height: PropTypes.number,
  style: PropTypes.object,
  cancelButtonStyles: PropTypes.object,
  confirmButtonStyles: PropTypes.object,
  canConfirm: PropTypes.bool,
};

OrderReviewActionButtonFooter.defaultProps = {
  height: 100,
  style: {},
  cancelButtonStyles: {},
  confirmButtonStyles: {},
  canConfirm: true,
};

export default OrderReviewActionButtonFooter;
