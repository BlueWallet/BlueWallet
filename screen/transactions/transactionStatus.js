import React, { Component } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import {
  BlueButton,
  SafeBlueArea,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueTransactionIncomingIcon,
  BlueCard,
  BlueText,
  BlueLoading,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HDSegwitBech32Transaction } from '../../class';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import Handoff from 'react-native-handoff';
import HandoffSettings from '../../class/handoff';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const buttonStatus = Object.freeze({
  possible: 1,
  unknown: 2,
  notPossible: 3,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
  },
  value: {
    color: BlueCurrentTheme.colors.alternativeTextColor2,
    fontSize: 36,
    fontWeight: '600',
  },
  valueUnit: {
    color: BlueCurrentTheme.colors.alternativeTextColor2,
    fontSize: 16,
    fontWeight: '600',
  },
  memo: {
    alignItems: 'center',
    marginVertical: 8,
  },
  memoText: {
    color: '#9aa0aa',
    fontSize: 14,
  },
  iconRoot: {
    backgroundColor: BlueCurrentTheme.colors.success,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 43,
    marginBottom: 53,
  },
  iconWrap: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    borderRadius: 15,
  },
  margin: {
    marginBottom: -40,
  },
  icon: {
    width: 25,
  },
  fee: {
    marginTop: 15,
    marginBottom: 13,
  },
  feeText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    color: '#00c49f',
    alignSelf: 'center',
  },
  confirmations: {
    borderRadius: 11,
    backgroundColor: BlueCurrentTheme.colors.lightButton,
    width: 109,
    height: 21,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationsText: {
    color: '#9aa0aa',
    fontSize: 11,
  },
  actions: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cancel: {
    marginVertical: 16,
  },
  cancelText: {
    color: '#d0021b',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailsText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
});

export default class TransactionsStatus extends Component {
  static contextType = BlueStorageContext;

  constructor(props, context) {
    super(props);
    const hash = props.route.params.hash;
    let foundTx = {};
    let from = [];
    let to = [];
    for (const tx of context.getTransactions()) {
      if (tx.hash === hash) {
        foundTx = tx;
        for (const input of foundTx.inputs) {
          from = from.concat(input.addresses);
        }
        for (const output of foundTx.outputs) {
          if (output.addresses) to = to.concat(output.addresses);
          if (output.scriptPubKey && output.scriptPubKey.addresses) to = to.concat(output.scriptPubKey.addresses);
        }
      }
    }

    let wallet = false;
    for (const w of context.wallets) {
      for (const t of w.getTransactions()) {
        if (t.hash === hash) {
          console.log('tx', hash, 'belongs to', w.getLabel());
          wallet = w;
          break;
        }
      }
    }

    this.state = {
      isLoading: true,
      tx: foundTx,
      from,
      to,
      wallet,
      isCPFPpossible: buttonStatus.unknown,
      isRBFBumpFeePossible: buttonStatus.unknown,
      isRBFCancelPossible: buttonStatus.unknown,
      isHandOffUseEnabled: false,
    };
  }

  async componentDidMount() {
    console.log('transactions/details - componentDidMount');
    const isHandOffUseEnabled = await HandoffSettings.isHandoffUseEnabled();
    this.setState({
      isLoading: false,
      isHandOffUseEnabled,
    });

    try {
      await this.checkPossibilityOfCPFP();
      await this.checkPossibilityOfRBFBumpFee();
      await this.checkPossibilityOfRBFCancel();
    } catch (_) {
      this.setState({
        isCPFPpossible: buttonStatus.notPossible,
        isRBFBumpFeePossible: buttonStatus.notPossible,
        isRBFCancelPossible: buttonStatus.notPossible,
      });
    }
    this.context.setSelectedWallet(this.state.wallet.getID());
  }

  async checkPossibilityOfCPFP() {
    if (!this.state.wallet.allowRBF()) {
      return this.setState({ isCPFPpossible: buttonStatus.notPossible });
    }

    const tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if ((await tx.isToUsTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0) {
      return this.setState({ isCPFPpossible: buttonStatus.possible });
    } else {
      return this.setState({ isCPFPpossible: buttonStatus.notPossible });
    }
  }

  async checkPossibilityOfRBFBumpFee() {
    if (!this.state.wallet.allowRBF()) {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.notPossible });
    }

    const tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if (
      (await tx.isOurTransaction()) &&
      (await tx.getRemoteConfirmationsNum()) === 0 &&
      (await tx.isSequenceReplaceable()) &&
      (await tx.canBumpTx())
    ) {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.possible });
    } else {
      return this.setState({ isRBFBumpFeePossible: buttonStatus.notPossible });
    }
  }

  async checkPossibilityOfRBFCancel() {
    if (!this.state.wallet.allowRBF()) {
      return this.setState({ isRBFCancelPossible: buttonStatus.notPossible });
    }

    const tx = new HDSegwitBech32Transaction(null, this.state.tx.hash, this.state.wallet);
    if (
      (await tx.isOurTransaction()) &&
      (await tx.getRemoteConfirmationsNum()) === 0 &&
      (await tx.isSequenceReplaceable()) &&
      (await tx.canCancelTx())
    ) {
      return this.setState({ isRBFCancelPossible: buttonStatus.possible });
    } else {
      return this.setState({ isRBFCancelPossible: buttonStatus.notPossible });
    }
  }

  render() {
    if (this.state.isLoading || !('tx' in this.state)) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        {this.state.isHandOffUseEnabled && (
          <Handoff
            title={`Bitcoin Transaction ${this.state.tx.hash}`}
            type="io.bluewallet.bluewallet"
            url={`https://blockstream.info/tx/${this.state.tx.hash}`}
          />
        )}
        <StatusBar barStyle="default" />
        <View style={styles.container}>
          <BlueCard>
            <View style={styles.center}>
              <Text style={styles.value}>
                {formatBalanceWithoutSuffix(this.state.tx.value, this.state.wallet.preferredBalanceUnit, true)}{' '}
                {this.state.wallet.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
                  <Text style={styles.valueUnit}>{this.state.wallet.preferredBalanceUnit}</Text>
                )}
              </Text>
            </View>

            {(() => {
              if (this.context.txMetadata[this.state.tx.hash]) {
                if (this.context.txMetadata[this.state.tx.hash].memo) {
                  return (
                    <View style={styles.memo}>
                      <Text style={styles.memoText}>{this.context.txMetadata[this.state.tx.hash].memo}</Text>
                      <BlueSpacing20 />
                    </View>
                  );
                }
              }
            })()}

            <View style={styles.iconRoot}>
              <View>
                <Icon name="check" size={50} type="font-awesome" color={BlueCurrentTheme.colors.successCheck} />
              </View>
              <View style={[styles.iconWrap, styles.margin]}>
                {(() => {
                  if (!this.state.tx.confirmations) {
                    return (
                      <View style={styles.icon}>
                        <BlueTransactionPendingIcon />
                      </View>
                    );
                  } else if (this.state.tx.value < 0) {
                    return (
                      <View style={styles.icon}>
                        <BlueTransactionOutgoingIcon />
                      </View>
                    );
                  } else {
                    return (
                      <View style={styles.icon}>
                        <BlueTransactionIncomingIcon />
                      </View>
                    );
                  }
                })()}
              </View>
            </View>

            {'fee' in this.state.tx && (
              <View style={styles.fee}>
                <BlueText style={styles.feeText}>
                  {loc.send.create_fee.toLowerCase()}{' '}
                  {formatBalanceWithoutSuffix(this.state.tx.fee, this.state.wallet.preferredBalanceUnit, true)}{' '}
                  {this.state.wallet.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && this.state.wallet.preferredBalanceUnit}
                </BlueText>
              </View>
            )}

            <View style={styles.confirmations}>
              <Text style={styles.confirmationsText}>
                {this.state.tx.confirmations > 6 ? '6+' : this.state.tx.confirmations} confirmations
              </Text>
            </View>
          </BlueCard>

          <View style={styles.actions}>
            {(() => {
              if (this.state.isCPFPpossible === buttonStatus.unknown) {
                return (
                  <>
                    <ActivityIndicator />
                    <BlueSpacing20 />
                  </>
                );
              } else if (this.state.isCPFPpossible === buttonStatus.possible) {
                return (
                  <>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('CPFP', {
                          txid: this.state.tx.hash,
                          wallet: this.state.wallet,
                        })
                      }
                      title={loc.transactions.status_bump}
                    />
                    <BlueSpacing20 />
                  </>
                );
              }
            })()}

            {(() => {
              if (this.state.isRBFBumpFeePossible === buttonStatus.unknown) {
                return (
                  <>
                    <ActivityIndicator />
                    <BlueSpacing20 />
                  </>
                );
              } else if (this.state.isRBFBumpFeePossible === buttonStatus.possible) {
                return (
                  <>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('RBFBumpFee', {
                          txid: this.state.tx.hash,
                          wallet: this.state.wallet,
                        })
                      }
                      title={loc.transactions.status_bump}
                    />
                  </>
                );
              }
            })()}
            {(() => {
              if (this.state.isRBFCancelPossible === buttonStatus.unknown) {
                return (
                  <>
                    <ActivityIndicator />
                  </>
                );
              } else if (this.state.isRBFCancelPossible === buttonStatus.possible) {
                return (
                  <>
                    <TouchableOpacity style={styles.cancel}>
                      <Text
                        onPress={() =>
                          this.props.navigation.navigate('RBFCancel', {
                            txid: this.state.tx.hash,
                            wallet: this.state.wallet,
                          })
                        }
                        style={styles.cancelText}
                      >
                        {loc.transactions.status_cancel}
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              }
            })()}

            <TouchableOpacity
              style={styles.details}
              onPress={() => this.props.navigation.navigate('TransactionDetails', { hash: this.state.tx.hash })}
            >
              <Text style={styles.detailsText}>{loc.send.create_details.toLowerCase()}</Text>
              <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

TransactionsStatus.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        hash: PropTypes.string,
      }),
    }),
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

TransactionsStatus.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: '',
  headerStyle: {
    ...BlueNavigationStyle().headerStyle,
    backgroundColor: BlueCurrentTheme.colors.customHeader,
  },
});
