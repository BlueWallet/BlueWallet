let BlueApp = require('../../BlueApp')
import React, { Component } from 'react';
import { ActivityIndicator,  View, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, } from 'react-navigation';
import { Icon, Card, Header, } from 'react-native-elements'
import QRCode from 'react-native-qrcode';
import { List, Button, ListItem } from 'react-native-elements'
import {
  BlueLoading, BlueSpacing20, BlueList, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueListItem, BlueHeader,
  BlueFormInput, BlueSpacing
} from '../../BlueComponents'

export default class ReceiveDetails extends Component {

  static navigationOptions = {
    tabBarLabel: 'Receive',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-cash' : 'ios-cash-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  }


  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address
    this.state = {
      isLoading: true,
      address : address
    }
    console.log(JSON.stringify(address))
  }

  async componentDidMount() {
    console.log('wallets/details - componentDidMount')
    this.setState({
      isLoading: false,
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }}  style={{flex: 1, paddingTop: 20}}>
        <BlueSpacing/>
        <BlueCard title={"Share this address with payer"} style={{alignItems: 'center', flex: 1}}>
          <TextInput style={{marginBottom:20, color:'white'}} editable={true} value={this.state.address} />
          <QRCode
            value={this.state.address}
            size={312}
            bgColor='white'
            fgColor={BlueApp.settings.brandingColor}/>

        </BlueCard>


        <BlueButton
          icon={{name: 'arrow-left', type: 'octicon'}}
          backgroundColor={BlueApp.settings.buttonBackground}
          onPress={() =>
            this.props.navigation.goBack()
          }
          title="Go back"
        />

      </SafeBlueArea>
    );
  }
}


