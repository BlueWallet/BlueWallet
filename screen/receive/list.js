/** @type {AppStorage} */
let BlueApp = require('../../BlueApp')
import React, { Component } from 'react';
import { ActivityIndicator,  Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, } from 'react-navigation';
import { Icon, Card, Header, } from 'react-native-elements'
import { List, ListItem, Button } from 'react-native-elements'
import {
  BlueLoading, BlueSpacing20, BlueList, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueListItem, BlueHeader,
  BlueFormInput, BlueSpacing
} from '../../BlueComponents'
let EV = require('../../events')

export default class ReceiveList extends Component {

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
    this.state = {
      isLoading: true,
    }
    this.walletsCount = 0;
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => {
      return this.componentDidMount()
    })
  }

  async componentDidMount() {
    console.log('receive/list - componentDidMount')
    let list = []

    this.walletsCount = 0;
    for (let w of BlueApp.getWallets()) {
      list.push({
        title: w.getAddress(),
        subtitle: w.getLabel(),
      })
      this.walletsCount++;
    }

    this.setState({
      isLoading: false,
      list: list
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }}  style={{flex: 1}}>
        <BlueHeader
          backgroundColor={BlueApp.settings.brandingColor}
          leftComponent={<Icon name='menu' color="#fff"           onPress={() => this.props.navigation.navigate('DrawerToggle') }/>}
          centerComponent={{ text: 'Choose a wallet to receive', style: { color: '#fff', fontSize: 25 }}}
        />

        <BlueCard  containerStyle={{padding: 0}}>

            {
              this.state.list.map((item, i) => (
                <BlueListItem

                  onPress={() =>
                    {
                      navigate('ReceiveDetails',  {address: item.title})
                    }
                  }
                  key={i}
                  title={item.title}
                  subtitle={item.subtitle}
                  leftIcon={{name: 'bitcoin', type: 'font-awesome', color: 'white'}}
                />
              ))
            }
        </BlueCard>


      </SafeBlueArea>
    );
  }
}


