/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';

import { BlueButton, BlueCopyTextToClipboard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import * as NavigationService from '../../NavigationService';
import { BlueCurrentTheme } from '../../components/themes';
import BottomModal from '../../components/BottomModal';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

export default class HodlHodlMyContracts extends Component {
  static contextType = BlueStorageContext;
  constructor(props) {
    super(props);

    props.navigation.setParams({ handleLogout: this.handleLogout });
    this.state = {
      contracts: [],
      isLoading: true,
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.inverval);
  }

  handleLogout = () => {
    this.context.setHodlHodlApiKey('', '<empty>');
    this.props.navigation.navigate('WalletsList');
  };

  async componentDidMount() {
    const hodlApiKey = await this.context.getHodlHodlApiKey();
    const hodlApi = new HodlHodlApi(hodlApiKey);
    this.setState({ hodlApi: hodlApi, contracts: [] });

    const inverval = setInterval(async () => {
      await this.refetchContracts();
    }, 60 * 1000);

    this.setState({ inverval });
    await this.refetchContracts();
  }

  render() {
    if (this.state.isLoading) return <BlueLoading />;
    return (
      <View style={styles.root}>
        <FlatList
          scrollEnabled={false}
          keyExtractor={(item, index) => {
            return item.id;
          }}
          ListEmptyComponent={() => <Text style={styles.emptyComponentText}>{loc.hodl.cont_no}</Text>}
          style={styles.flatList}
          ItemSeparatorComponent={() => <View style={styles.itemSeparatorComponent} />}
          data={this.state.contracts}
          renderItem={({ item: contract, index, separators }) => (
            <TouchableHighlight
              onShowUnderlay={separators.highlight}
              onHideUnderlay={separators.unhighlight}
              onPress={() => this._onContractPress(contract)}
            >
              <View style={styles.flexDirectionRow}>
                <View style={['paid', 'completed'].includes(contract.status) ? styles.statusGreenWrapper : styles.statusGrayWrapper}>
                  <Text style={['paid', 'completed'].includes(contract.status) ? styles.statusGreenText : styles.statusGrayText}>
                    {contract.status}
                  </Text>
                </View>

                <View style={styles.flexDirectionColumn}>
                  <View style={styles.flexDirectionRow}>
                    <Text style={styles.volumeBreakdownText}>
                      {contract.volume_breakdown.goes_to_buyer} {contract.asset_code}
                    </Text>
                    <Text style={styles.roleText}>{contract.your_role === 'buyer' ? loc.hodl.cont_buying : loc.hodl.cont_selling}</Text>
                  </View>

                  <View>
                    <Text style={styles.contractStatusText}>{contract.statusText}</Text>
                  </View>
                </View>
              </View>
            </TouchableHighlight>
          )}
        />
        {this.renderContract()}
      </View>
    );
  }

  async refetchContracts() {
    this.setState({
      isLoading: true,
    });

    const hodlApi = this.state.hodlApi;
    let contracts = [];
    let contractToDisplay = this.state.contractToDisplay;

    const contractIds = await this.context.getHodlHodlContracts();

    /*
     * Initiator sends “Getting contract” request once every 1-3 minutes until contract.escrow.address is not null (thus, waiting for offer’s creator to confirm his payment password in case he uses the website)
     * Each party verifies the escrow address locally
     * Each party sends “Confirming contract’s escrow validity” request to the server
     */
    for (const id of contractIds) {
      let contract;
      try {
        contract = await hodlApi.getContract(id);
      } catch (_) {
        continue;
      }
      if (contract.status === 'canceled') continue;
      if (contract.escrow && contract.escrow.address && hodlApi.verifyEscrowAddress()) {
        await hodlApi.markContractAsConfirmed(id);
        contract.isDepositedEnought =
          contract.escrow.confirmations >= contract.confirmations && +contract.escrow.amount_deposited >= +contract.volume;
        // technically, we could fetch balance of escrow address ourselved and verify, but we are relying on api here

        contract.statusText = loc.hodl.cont_st_waiting;
        if (contract.isDepositedEnought && contract.status !== 'paid') contract.statusText = loc.hodl.cont_st_paid_enought;
        if (contract.status === 'paid') contract.statusText = loc.hodl.cont_st_paid_waiting;
        if (contract.status === 'in_progress' && contract.your_role === 'buyer') contract.statusText = loc.hodl.cont_st_in_progress_buyer;
        if (contract.status === 'completed') contract.statusText = loc.hodl.cont_st_completed;
      }

      contracts.push(contract);

      if (contractToDisplay && contract.id === this.state.contractToDisplay.id) {
        // refreshing contract that is currently being displayed
        contractToDisplay = contract;
      }
    }

    contracts = contracts.sort((a, b) => (a.created_at >= b.created_at ? -1 : 1)); // new contracts on top

    this.setState({ hodlApi: hodlApi, contracts, contractToDisplay, isLoading: false });
  }

  _onContractPress(contract) {
    this.setState({
      contractToDisplay: contract,
      isRenderContractVisible: true,
    });
  }

  hideContractModal = () => {
    Keyboard.dismiss();
    this.setState({ isRenderContractVisible: false });
  };

  renderContract = () => {
    if (!this.state.contractToDisplay) return;

    return (
      <BottomModal isVisible={this.state.isRenderContractVisible} onClose={this.hideContractModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.modalContentCentered}>
              <Text style={styles.btcText}>
                {this.state.contractToDisplay.volume_breakdown.goes_to_buyer} {this.state.contractToDisplay.asset_code}
              </Text>

              <View style={styles.statusGreenWrapper}>
                <Text style={styles.statusGreenText}>
                  {this.state.contractToDisplay.price} {this.state.contractToDisplay.currency_code}
                </Text>
              </View>
            </View>

            <Text style={styles.subheaderText}>{loc.hodl.cont_address_to}</Text>
            <View style={styles.modalContentCentered}>
              <View style={styles.statusGrayWrapper2}>
                <Text
                  style={styles.statusGrayText2}
                  onPress={() => Linking.openURL(`https://blockstream.info/address/${this.state.contractToDisplay.release_address}`)}
                >
                  {this.state.contractToDisplay.release_address}
                </Text>
              </View>
            </View>
            <BlueSpacing10 />

            <Text style={styles.subheaderText}>{loc.hodl.cont_address_escrow}</Text>
            <View style={styles.modalContentCentered}>
              <View style={styles.statusGrayWrapper2}>
                <Text
                  style={styles.statusGrayText2}
                  onPress={() => Linking.openURL(`https://blockstream.info/address/${this.state.contractToDisplay.escrow.address}`)}
                >
                  {this.state.contractToDisplay.escrow.address}
                </Text>
              </View>
            </View>
            <BlueSpacing20 />

            {this.isAllowedToMarkContractAsPaid() ? (
              <View>
                <Text style={styles.subheaderText}>{loc.hodl.cont_how}</Text>
                <View style={styles.modalContentCentered}>
                  <View style={styles.statusGrayWrapper2}>
                    <BlueCopyTextToClipboard text={this.state.contractToDisplay.payment_method_instruction.details} />
                  </View>
                </View>
              </View>
            ) : (
              <View />
            )}

            <BlueSpacing20 />

            {this.isAllowedToMarkContractAsPaid() ? (
              <View>
                <BlueButton title={loc.hodl.cont_paid} onPress={() => this._onMarkContractAsPaid()} />
                <BlueSpacing20 />
              </View>
            ) : (
              <View />
            )}

            <BlueSpacing20 />

            {this.state.contractToDisplay.can_be_canceled && (
              <Text onPress={() => this._onCancelContract()} style={styles.cancelContractText}>
                {loc.hodl.cont_cancel}
              </Text>
            )}

            <Text onPress={() => this._onOpenContractOnWebsite()} style={styles.openChatText}>
              {loc.hodl.cont_chat}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  /**
   * If you are the buyer, DO NOT SEND PAYMENT UNTIL CONTRACT STATUS IS "in_progress".
   */
  _onMarkContractAsPaid() {
    if (!this.state.contractToDisplay) return;

    Alert.alert(
      loc.hodl.cont_paid_q,
      loc.hodl.cont_paid_e,
      [
        {
          text: loc._.yes,
          onPress: async () => {
            const hodlApi = this.state.hodlApi;
            try {
              await hodlApi.markContractAsPaid(this.state.contractToDisplay.id);
              this.setState({ isRenderContractVisible: false });
              await this.refetchContracts();
            } catch (Error) {
              alert(Error);
            }
          },
          style: 'default',
        },
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  async _onOpenContractOnWebsite() {
    if (!this.state.contractToDisplay) return;
    const hodlApi = this.state.hodlApi;
    const sigKey = await this.context.getHodlHodlSignatureKey();
    if (!sigKey) {
      alert('Error: signature key not set'); // should never happen
      return;
    }

    const autologinKey = await hodlApi.requestAutologinToken(sigKey);
    const uri = 'https://hodlhodl.com/contracts/' + this.state.contractToDisplay.id + '?sign_in_token=' + autologinKey;
    this.setState({ isRenderContractVisible: false }, () => {
      NavigationService.navigate('HodlHodlWebview', { uri });
    });
  }

  _onCancelContract() {
    if (!this.state.contractToDisplay) return;

    Alert.alert(
      loc.hodl.cont_cancel_q,
      '',
      [
        {
          text: loc.hodl.cont_cancel_y,
          onPress: async () => {
            const hodlApi = this.state.hodlApi;
            try {
              await hodlApi.cancelContract(this.state.contractToDisplay.id);
              this.setState({ isRenderContractVisible: false });
              await this.refetchContracts();
            } catch (Error) {
              alert(Error);
            }
          },
          style: 'default',
        },
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  isAllowedToMarkContractAsPaid() {
    return this.state.contractToDisplay.status === 'in_progress' && this.state.contractToDisplay.your_role === 'buyer';
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.modal,
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 425,
  },
  modalContentCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusGreenWrapper: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
    borderRadius: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 15,
    paddingLeft: 15,
    paddingRight: 15,
  },
  statusGreenText: {
    fontSize: 12,
    color: BlueCurrentTheme.colors.feeValue,
  },
  statusGrayWrapper: {
    backgroundColor: BlueCurrentTheme.colors.lightBorder,
    borderRadius: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 15,
    paddingLeft: 15,
    paddingRight: 15,
  },
  statusGrayText: {
    fontSize: 12,
    color: '#9AA0AA',
  },
  statusGrayWrapper2: {
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderRadius: 5,
    minHeight: 28,
    maxHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
  },
  statusGrayText2: {
    fontSize: 12,
    color: '#9AA0AA',
  },
  btcText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  subheaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BlueCurrentTheme.colors.feeText,
  },
  loading: { backgroundColor: BlueCurrentTheme.colors.elevated },
  emptyComponentText: { textAlign: 'center', color: '#9AA0AA', paddingHorizontal: 16, backgroundColor: BlueCurrentTheme.colors.elevated },
  itemSeparatorComponent: { height: 0.5, width: '100%', backgroundColor: '#C8C8C8' },
  flexDirectionRow: { flexDirection: 'row' },
  flexDirectionColumn: { flexDirection: 'column' },
  volumeBreakdownText: { fontSize: 18, color: BlueCurrentTheme.colors.foregroundColor },
  contractStatusText: { fontSize: 13, color: 'gray', fontWeight: 'normal' },
  cancelContractText: { color: '#d0021b', fontSize: 15, paddingTop: 20, fontWeight: '500', textAlign: 'center' },
  openChatText: { color: BlueCurrentTheme.colors.foregroundColor, fontSize: 15, paddingTop: 20, fontWeight: '500', textAlign: 'center' },
  flatList: { paddingTop: 30, backgroundColor: BlueCurrentTheme.colors.elevated },
  roleText: { fontSize: 14, color: 'gray', padding: 5 },
  marginRight: {
    marginRight: 20,
  },
});

HodlHodlMyContracts.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
  }),
};

HodlHodlMyContracts.navigationOptions = navigationStyle(
  {
    closeButton: true,
  },
  (options, { theme, navigation, route }) => ({
    ...options,
    title: loc.hodl.cont_title,
    headerStyle: {
      backgroundColor: theme.colors.elevated,
    },
    headerRight: () => (
      <TouchableOpacity
        style={styles.marginRight}
        onPress={() => {
          Alert.alert(
            loc.hodl.are_you_sure_you_want_to_logout,
            '',
            [
              {
                text: loc._.ok,
                onPress: route.params.handleLogout,
                style: 'default',
              },
              { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
            ],
            { cancelable: false },
          );
        }}
      >
        <BlueText>{loc.hodl.logout}</BlueText>
      </TouchableOpacity>
    ),
  }),
);
