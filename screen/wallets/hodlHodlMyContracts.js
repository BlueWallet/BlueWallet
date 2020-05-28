/* global alert */
import React, { Component } from 'react';
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
  View,
} from 'react-native';
import { BlueButton, BlueLoading, BlueNavigationStyle, BlueSpacing10, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import { AppStorage } from '../../class';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import Modal from 'react-native-modal';

const BlueApp: AppStorage = require('../../BlueApp');

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 400,
    height: 400,
  },
  modalContentCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusGreenWrapper: {
    backgroundColor: '#d2f8d5',
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
    color: '#37bfa0',
  },
  statusGrayWrapper: {
    backgroundColor: '#ebebeb',
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
    color: 'gray',
  },
  statusGrayWrapper2: {
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
  },
  statusGrayText2: {
    fontSize: 12,
    color: 'gray',
  },
  btcText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#0c2550',
  },
  subheaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0c2550',
  },
});

export default class HodlHodlMyContracts extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'My contracts',
    headerLeft: null,
  });

  constructor(props) {
    super(props);

    this.state = {
      contracts: [],
      isLoading: true,
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.inverval);
  }

  async componentDidMount() {
    const hodlApiKey = await BlueApp.getHodlHodlApiKey();
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
      <SafeBlueArea>
        <FlatList
          scrollEnabled={false}
          keyExtractor={(item, index) => {
            return item.id;
          }}
          ListEmptyComponent={() => (
            <Text style={{ textAlign: 'center', color: '#9AA0AA', paddingHorizontal: 16 }}>You dont have any contracts in progress</Text>
          )}
          style={{ paddingTop: 30 }}
          ItemSeparatorComponent={() => <View style={{ height: 0.5, width: '100%', backgroundColor: '#C8C8C8' }} />}
          data={this.state.contracts}
          renderItem={({ item: contract, index, separators }) => (
            <TouchableHighlight
              onShowUnderlay={separators.highlight}
              onHideUnderlay={separators.unhighlight}
              onPress={() => this._onContractPress(contract)}
            >
              <View style={{ flexDirection: 'row' }}>
                <View style={['paid', 'completed'].includes(contract.status) ? styles.statusGreenWrapper : styles.statusGrayWrapper}>
                  <Text style={['paid', 'completed'].includes(contract.status) ? styles.statusGreenText : styles.statusGrayText}>
                    {contract.status}
                  </Text>
                </View>

                <View style={{ flexDirection: 'column' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 18, color: '#0c2550' }}>
                      {contract.volume_breakdown.goes_to_buyer} {contract.asset_code}
                    </Text>
                    <Text style={{ fontSize: 14, color: 'gray', padding: 5 }}>{contract.your_role === 'buyer' ? 'buying' : 'selling'}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, color: 'gray', fontWeight: 'normal' }}>{contract.statusText}</Text>
                  </View>
                </View>
              </View>
            </TouchableHighlight>
          )}
        />
        {this.renderContract()}
      </SafeBlueArea>
    );
  }

  async refetchContracts() {
    this.setState({
      isLoading: true,
    });

    const hodlApi = this.state.hodlApi;
    let contracts = [];
    let contractToDisplay = this.state.contractToDisplay;

    const contractIds = await BlueApp.getHodlHodlContracts();

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

        contract.statusText = 'Waiting for seller to deposit bitcoins to escrow...';
        if (contract.isDepositedEnought && contract.status !== 'paid')
          contract.statusText = 'Bitcoins are in escrow! Please pay seller\nvia agreed payment method';
        if (contract.status === 'paid') contract.statusText = 'Waiting for seller to release coins from escrow';
        if (contract.status === 'in_progress' && contract.your_role === 'buyer')
          contract.statusText = 'Coins are in escrow, please pay seller';

        if (contract.status === 'completed') contract.statusText = 'All done!';
      }

      contracts.push(contract);

      if (contractToDisplay && contract.id === this.state.contractToDisplay.id) {
        // refreshing contract that is currently being displayed
        contractToDisplay = contract;
      }
    }

    this.setState({ hodlApi: hodlApi, contracts, contractToDisplay, isLoading: false });
  }

  _onContractPress(contract) {
    this.setState({
      contractToDisplay: contract,
      isRenderContractVisible: true,
    });
  }

  renderContract = () => {
    if (!this.state.contractToDisplay) return;

    return (
      <Modal
        isVisible={this.state.isRenderContractVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isRenderContractVisible: false });
        }}
      >
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

            <Text style={styles.subheaderText}>To</Text>
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

            <Text style={styles.subheaderText}>Escrow</Text>
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

            <Text style={styles.subheaderText}>How to pay</Text>
            <View style={styles.modalContentCentered}>
              <View style={styles.statusGrayWrapper2}>
                <Text style={styles.statusGrayText2}>{this.state.contractToDisplay.payment_method_instruction.details}</Text>
              </View>
            </View>

            <BlueSpacing20 />

            {this.state.contractToDisplay.status === 'in_progress' && this.state.contractToDisplay.your_role === 'buyer' && (
              <View>
                <BlueButton title="Mark contract as Paid" onPress={() => this._onMarkContractAsPaid()} />
                <BlueSpacing20 />
              </View>
            )}

            <BlueSpacing20 />

            {this.state.contractToDisplay.can_be_canceled && (
              <Text
                onPress={() => this._onCancelContract()}
                style={{ color: '#d0021b', fontSize: 15, paddingTop: 20, fontWeight: '500', textAlign: 'center' }}
              >
                {'Cancel contract'}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  /**
   * If you are the buyer, DO NOT SEND PAYMENT UNTIL CONTRACT STATUS IS "in_progress".
   */
  _onMarkContractAsPaid() {
    if (!this.state.contractToDisplay) return;

    Alert.alert(
      'Are you sure you want to mark this contract as paid?',
      `Do this only if you sent funds to the seller via agreed payment method`,
      [
        {
          text: 'Yes',
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
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  _onCancelContract() {
    if (!this.state.contractToDisplay) return;

    Alert.alert(
      'Are you sure you want to cancel this contract?',
      ``,
      [
        {
          text: 'Yes, cancel contract',
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
          text: 'No',
          onPress: () => {},
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }
}
