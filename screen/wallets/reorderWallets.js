import React, { Component } from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle } from '../../BlueComponents';
import DraggableFlatList from 'react-native-draggable-flatlist';
import LinearGradient from 'react-native-linear-gradient';
import { WatchOnlyWallet, LegacyWallet } from '../../class';
import { HDLegacyP2PKHWallet } from '../../class/hd-legacy-p2pkh-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/hd-legacy-breadwallet-wallet';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
let BlueApp = require('../../BlueApp');
let loc = require('../../loc/');

export default class ReorderWallets extends Component {
  state = {
    data: BlueApp.getWallets().concat(false),
  };

  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
  });

  // renderItem = ({ item, index, move, moveEnd, isActive }) => {
  //   return (
  //     <TouchableOpacity
  //       style={{
  //         height: 100,
  //         backgroundColor: isActive ? 'blue' : item.backgroundColor,
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //       }}
  //       onLongPress={move}
  //       onPressOut={moveEnd}
  //     >
  //       <Text
  //         style={{
  //           fontWeight: 'bold',
  //           color: 'white',
  //           fontSize: 32,
  //         }}
  //       >
  //         {item.label}
  //       </Text>
  //     </TouchableOpacity>
  //   );
  // };

  _renderItem({ item, index, move, moveEnd, isActive }) {
    if (!item) {
      return;
    }

    let gradient1 = '#65ceef';
    let gradient2 = '#68bbe1';

    if (new WatchOnlyWallet().type === item.type) {
      gradient1 = '#7d7d7d';
      gradient2 = '#4a4a4a';
    }

    if (new LegacyWallet().type === item.type) {
      gradient1 = '#40fad1';
      gradient2 = '#15be98';
    }

    if (new HDLegacyP2PKHWallet().type === item.type) {
      gradient1 = '#e36dfa';
      gradient2 = '#bd10e0';
    }

    if (new HDLegacyBreadwalletWallet().type === item.type) {
      gradient1 = '#fe6381';
      gradient2 = '#f99c42';
    }

    if (new HDSegwitP2SHWallet().type === item.type) {
      gradient1 = '#c65afb';
      gradient2 = '#9053fe';
    }

    if (new LightningCustodianWallet().type === item.type) {
      gradient1 = '#f1be07';
      gradient2 = '#f79056';
    }

    return (

      <View
        style={{ padding: 10, marginVertical: 17 }}
        shadowOpacity={40 / 100}
        shadowOffset={{ width: 0, height: 0 }}
        shadowRadius={5}
      >
        <TouchableOpacity
                onLongPress={move}
        onPressOut={moveEnd}
        >
        <LinearGradient
          shadowColor="#000000"
          colors={[gradient1, gradient2]}
          style={{
            padding: 15,
            borderRadius: 10,
            minHeight: 164,
            elevation: 5,
          }}
        >
          <Image
            source={(new LightningCustodianWallet().type === item.type && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')}
            style={{
              width: 99,
              height: 94,
              position: 'absolute',
              bottom: 0,
              right: 0,
            }}
          />

          <Text style={{ backgroundColor: 'transparent' }} />
          <Text
            numberOfLines={1}
            style={{
              backgroundColor: 'transparent',
              fontSize: 19,
              color: '#fff',
            }}
          >
            {item.getLabel()}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              backgroundColor: 'transparent',
              fontWeight: 'bold',
              fontSize: 36,
              color: '#fff',
            }}
          >
            {loc.formatBalance(item.getBalance())}
          </Text>
          <Text style={{ backgroundColor: 'transparent' }} />
          <Text
            numberOfLines={1}
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#fff',
            }}
          >
            {loc.wallets.list.latest_transaction}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              backgroundColor: 'transparent',
              fontWeight: 'bold',
              fontSize: 16,
              color: '#fff',
            }}
          >
            {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
          </Text>
        </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  render() {
    return (
      <SafeBlueArea>
        <DraggableFlatList
          style={{ flex: 1 }}
          data={this.state.data}
          renderItem={this._renderItem}
          keyExtractor={(item, index) => `draggable-item-${item.key}`}
          scrollPercent={5}
          onMoveEnd={({ data }) => this.setState({ data })}
        />
      </SafeBlueArea>
    );
  }
}
