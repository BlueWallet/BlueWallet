/** @type {AppStorage} */
let BlueApp = require('../../BlueApp')
import React, { Component } from 'react';
import { ActivityIndicator, StyleSheet, ListView, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueLoading, BlueSpacing20, BlueList, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueListItem, BlueHeader,
  BlueFormInput, BlueSpacing
} from '../../BlueComponents'
import { Icon,Header, List, ListItem, Avatar } from 'react-native-elements'
let EV = require('../../events')



let ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2,});

export default class WalletsList extends Component {

  static navigationOptions = {
    tabBarLabel: 'Wallets',
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
    this.state = {
      isLoading: true,
    }
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.refreshFunction.bind(this))
  }

  async componentDidMount() {
    console.log('wallets/list - componentDidMount')
    this.refreshFunction()
  } // end of componendDidMount

  refreshFunction () {
    this.setState({
      isLoading: true,
    }, () => {
      setTimeout(() => {
        this.setState({
          isLoading: false,
          dataSource: ds.cloneWithRows(BlueApp.getWallets()),
        })
      }, 1)
    })
  }


  render() {
    const {navigate} = this.props.navigation;

    if (this.state.isLoading) {
      return (
        <BlueLoading/>
      );
    }

    return (
      <SafeBlueArea>
        <BlueHeader
          leftComponent={<Icon name='menu' color="#fff"           onPress={() => this.props.navigation.navigate('DrawerToggle') }/>}
          centerComponent={{ text: 'Blue Wallet', style: { color: '#fff', fontSize: 25 }}}
        />
        <BlueCard title='My Bitcoin Wallets' >
          <BlueText style={{marginBottom: 10}}>
            A wallet represents a pair of a secret (private key) and an address you can share to receive coins.
          </BlueText>

          <BlueList>
            <ListView
              enableEmptySections={true}
              maxHeight={290}
              dataSource={this.state.dataSource}
              renderRow={(rowData) => {
                  return (
                    <BlueListItem
                      onPress={() =>
                      {
                        navigate('WalletDetails',  {address : rowData.getAddress()})
                      }}
                      leftIcon={{name: 'bitcoin', type: 'font-awesome', color: '#fff'}}

                      title={rowData.getLabel() + ' | ' + rowData.getBalance() + " BTC"  }
                      subtitle={rowData.getShortAddress()}
                      hideChevron={false}
                    />
                  )
                }
              }
            />
        </BlueList>
        </BlueCard>



        <BlueButton
          icon={{name: 'plus-small', type: 'octicon'}}
          onPress={() => {
            navigate('AddWallet')
          }}
          title="Add Wallet"
        />



      </SafeBlueArea>
    );
  }
}