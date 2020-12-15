import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { BlueSpacing20 } from '../../../../BlueComponents';
import { BlueCurrentTheme } from '../../../../components/themes';
import loc from '../../../../loc';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TradingLaunchFooter = ({
  onBuySelected,
  onSellSelected,
  onClosePositionSelected,
  canClosePosition,
  baseFooterHeight,
  onOpenTradingModal,
  onCloseTradingModal,
}) => {
  const customContainerStyles = {
    height: baseFooterHeight,
    backgroundColor: BlueCurrentTheme.colors.cta2,
  };
  const customModalContentStyles = { marginBottom: baseFooterHeight };

  const [isModalVisible, setIsModalVisible] = useState(false);

  function showActionsModal() {
    onOpenTradingModal();
    setIsModalVisible(true);
  }

  function closeActionsModal() {
    onCloseTradingModal();
    setIsModalVisible(false);
  }

  function onBuyButtonPressed() {
    closeActionsModal();
    onBuySelected();
  }

  function onSellButtonPressed() {
    closeActionsModal();
    onSellSelected();
  }

  function onClosePositionPressed() {
    closeActionsModal();
    onClosePositionSelected();
  }

  function TradingActionsModal() {
    return (
      <Modal
        useNativeDriver={false}
        isVisible={isModalVisible}
        style={styles.actionsModal}
        deviceWidth={screenWidth}
        deviceHeight={screenHeight}
        onBackdropPress={closeActionsModal}
        animationIn="bounceInUp"
        animationOut="slideOutDown"
      >
        <View style={[styles.modalContentContainer, customModalContentStyles]}>
          {canClosePosition && (
            <View>
              <TouchableOpacity onPress={onClosePositionPressed}>
                <View style={[styles.buttonContainer, styles.modalActionButtonContainer, styles.closePositionButtonContainer]}>
                  <Text style={styles.modalActionButtonTitle}>{loc.derivatives_trading.trading.close_position}</Text>
                </View>
              </TouchableOpacity>

              <BlueSpacing20 />
            </View>
          )}

          <TouchableOpacity onPress={onBuyButtonPressed}>
            <View style={[styles.buttonContainer, styles.modalActionButtonContainer, styles.buyButtonContainer]}>
              <Text style={styles.modalActionButtonTitle}>{loc.derivatives_trading.buy}</Text>
            </View>
          </TouchableOpacity>

          <BlueSpacing20 />

          <TouchableOpacity onPress={onSellButtonPressed}>
            <View style={[styles.buttonContainer, styles.modalActionButtonContainer, styles.sellButtonContainer]}>
              <Text style={styles.modalActionButtonTitle}>{loc.derivatives_trading.sell}</Text>
            </View>
          </TouchableOpacity>

          <BlueSpacing20 />
        </View>
      </Modal>
    );
  }

  return (
    <View style={[styles.mainContainer, customContainerStyles]}>
      <View style={[styles.footerContentContainer]}>
        <TouchableOpacity onPress={showActionsModal} style={{bottom: 30}}>
          <View style={[styles.buttonContainer, styles.modalActionButtonContainer, styles.tradeButtonContainer]}>
            <Text style={styles.modalActionButtonTitle}>{loc.derivatives_trading.trade}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <TradingActionsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  footerContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'black',
  },

  actionsModal: {
    flex: 1,
  },

  modalContentContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    alignItems: 'center',
    minHeight: 200,
  },

  buttonContainer: {
    height: 54,
    maxWidth: 400,
    width: screenWidth * 0.75,
  },

  modalActionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },

  modalActionButtonTitle: {
    marginLeft: 0,
    fontSize: 18,
    color: 'white',
  },

  buyButtonContainer: {
    backgroundColor: BlueCurrentTheme.colors.tradingProfit,
  },

  sellButtonContainer: {
    backgroundColor: BlueCurrentTheme.colors.tradingLoss,
  },

  closePositionButtonContainer: {
    backgroundColor: '#F7931A',
  },

  tradeButtonContent: {
    backgroundColor: BlueCurrentTheme.colors.tradingProfit,
  },

  tradeButtonContainer: {
    backgroundColor: BlueCurrentTheme.colors.tradingProfit,
  },
});

TradingLaunchFooter.propTypes = {
  onBuySelected: PropTypes.func.isRequired,
  onSellSelected: PropTypes.func.isRequired,
  onClosePositionSelected: PropTypes.func.isRequired,
  canClosePosition: PropTypes.bool,
  baseFooterHeight: PropTypes.number,
};

TradingLaunchFooter.defaultProps = {
  canClosePosition: true,
  bottomOffset: Platform.OS === 'ios' ? 20 : 0,
  baseFooterHeight: 88,
};

export default TradingLaunchFooter;
