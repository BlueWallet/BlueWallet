/** @type {AppStorage} */

let BlueApp = require('../../BlueApp')
import React, { Component } from 'react';
import { ActivityIndicator, TextInput,  View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, } from 'react-navigation';
import { Icon, Card, Header, } from 'react-native-elements'
import { List, Button, ListItem } from 'react-native-elements'
import { FormInput, Text, FormValidationMessage } from 'react-native-elements'
import {
  BlueSpacing, BlueFormInput, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueListItem, BlueHeader,
  BlueFormLabel, BlueListView
} from '../../BlueComponents'
let EV = require('../../events')
let BigNumber = require('bignumber.js');

export default class WalletDetails extends Component {

  static navigationOptions = {
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  }


  constructor(props) {
    super(props);

    let address = props.navigation.state.params.address

    /**  @type {AbstractWallet}   */
    let wallet

    for (let w of BlueApp.getWallets()){
      if (w.getAddress() === address) { // found our wallet
        wallet = w
      }
    }

    this.state = {
      confirmDelete: false,
      isLoading: true,
      wallet
    }
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    })
  }

  async setLabel(text) {
    this.state.wallet.label = text
    this.setState({
      labelChanged: true
    }) /* also, a hack to make screen update new typed text*/
  }


  render() {
    const {navigate} = this.props.navigation;

    if (this.state.isLoading) {
      return (
        <View style={{flex: 1, paddingTop: 20}}>
          <ActivityIndicator />
        </View>
      );
    }


    return (
      <SafeBlueArea  style={{flex: 1, paddingTop: 20,}}>
        <BlueSpacing/>
        <BlueCard title={"Wallet Details"} style={{alignItems: 'center', flex: 1}}>


          <BlueFormLabel>Address:</BlueFormLabel>
          <BlueFormInput value={this.state.wallet.getAddress()} editable={false} />

          <BlueFormLabel>Type:</BlueFormLabel>
          <BlueFormInput value={this.state.wallet.getTypeReadable()} editable={false} />

          <BlueFormLabel>Label:</BlueFormLabel>
          <BlueFormInput
                value={this.state.wallet.getLabel()}
                onChangeText={(text) => {this.setLabel(text)}}
          />

        </BlueCard>


        {(() => {
          if (this.state.confirmDelete) {
            return (
              <View style={{alignItems: 'center',}}>
                <BlueText h4>Are you sure?</BlueText>
                <BlueButton
                  icon={{name: 'stop', type: 'octicon'}}
                  onPress={async () =>
                  {
                    BlueApp.deleteWallet(this.state.wallet)
                    await BlueApp.saveToDisk()
                    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED)
                    EV(EV.enum.WALLETS_COUNT_CHANGED)
                    this.props.navigation.goBack()
                  }
                  }
                  title="Yes, delete"
                />
                <BlueButton
                  onPress={async () => {
                    this.setState({confirmDelete : false})
                  }}
                  title="No, cancel"
                />
              </View>
            );
          } else {
            return (
              <View>
              <BlueButton
                icon={{name: 'stop', type: 'octicon'}}
                onPress={async () => {
                  this.setState({confirmDelete : true})
                }}
                title="Delete this wallet"
              />
                <BlueButton
                  onPress={() =>
                    this.props.navigation.navigate('WalletExport', {address: this.state.wallet.getAddress()} )
                  }
                  title="Export / backup"
                />
                <BlueButton
                  icon={{name: 'arrow-left', type: 'octicon'}}
                  onPress={async () =>
                  {

                    if (this.state.labelChanged) {
                      await BlueApp.saveToDisk()
                      EV(EV.enum.WALLETS_COUNT_CHANGED) // TODO: some other event type?
                    }
                    this.props.navigation.goBack()
                  }
                  }
                  title="Go back"
                />

              </View>

            )
          }
        })()}






      </SafeBlueArea>
    );
  }
}


