import React, { useState } from 'react';
import PropTypes from 'prop-types';
import loc from '../../../../loc';
import { View, StyleSheet, Platform, Dimensions, Text, TouchableOpacity } from 'react-native';
import { BlueCurrentTheme } from '../../../../components/themes';
import { BlueSpacing20 } from '../../../../BlueComponents';
import Modal from 'react-native-modal';
import { Icon } from 'react-native-elements';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TradingLaunchFooter = ({
  onBuySelected,
  onSellSelected,
  onClosePositionSelected,
  canClosePosition,
  bottomOffset,
  baseFooterHeight,
  onOpenTradingModal,
  onCloseTradingModal,
}) => {
  const customContainerStyles = {
    height: baseFooterHeight,
    backgroundColor: BlueCurrentTheme.colors.cta2,
    // paddingBottom: bottomOffset,
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
    console.log('hello')
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
            <Icon name="layers" type="feather" color={BlueCurrentTheme.colors.buttonTextColor} />
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
    fontSize: 15,
    color: BlueCurrentTheme.colors.buttonTextColor,
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
  bottomOffset: PropTypes.number,
  baseFooterHeight: PropTypes.number,
};

TradingLaunchFooter.defaultProps = {
  canClosePosition: true,
  bottomOffset: Platform.OS === 'ios' ? 20 : 0,
  baseFooterHeight: 88,
};

export default TradingLaunchFooter;
