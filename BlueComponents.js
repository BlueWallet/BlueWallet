/** @type {AppStorage} */
import React, { Component } from 'react'
import { SafeAreaView } from 'react-navigation'
import { Button, FormLabel, FormInput, Card, Text, Header, List, ListItem } from 'react-native-elements'
import { ActivityIndicator, ListView, View } from 'react-native'
let BlueApp = require('./BlueApp')

export class BlueButton extends Component {
  render () {
    return (
      <Button
        {...this.props}
        style={{marginTop: 20, borderRadius: 6, borderWidth: 0.7, borderColor: '#ffffff'}}
        borderRadius={10}
        backgroundColor={BlueApp.settings.buttonBackground}

      />
    )
  }
  /* icon={{name: 'home', type: 'octicon'}} */
}

export class SafeBlueArea extends Component {
  render () {
    return (
      <SafeAreaView
        {...this.props}
        forceInset={{ horizontal: 'always' }} style={{flex: 1, backgroundColor: BlueApp.settings.brandingColor}}
      />
    )
  }
}

export class BlueCard extends Component {
  render () {
    return (
      <Card
        {...this.props}
        titleStyle={{color: 'white'}}
        containerStyle={{backgroundColor: BlueApp.settings.buttonBackground}}
        wrapperStyle={{backgroundColor: BlueApp.settings.buttonBackground}}
      />
    )
  }
}

export class BlueText extends Component {
  render () {
    return (
      <Text
        {...this.props}
        style={{color: 'white'}}
      />
    )
  }
}

export class BlueListItem extends Component {
  render () {
    return (
      <ListItem
        {...this.props}
        containerStyle={{backgroundColor: BlueApp.settings.brandingColor}}
        titleStyle={{color: 'white', fontSize: 18}}
        subtitleStyle={{color: 'white'}}
      />
    )
  }
}

export class BlueFormLabel extends Component {
  render () {
    return (
      <FormLabel
        {...this.props}
        labelStyle={{color: 'white'}}
      />
    )
  }
}

export class BlueFormInput extends Component {
  render () {
    return (
      <FormInput
        {...this.props}
        inputStyle={{color: 'white'}}
      />
    )
  }
}

export class BlueHeader extends Component {
  render () {
    return (
      <Header
        {...this.props}
        backgroundColor={BlueApp.settings.brandingColor}
      />
    )
  }
}

export class BlueSpacing extends Component {
  render () {
    return (
      <View
        {...this.props}
        style={{height: 60, backgroundColor: BlueApp.settings.brandingColor}}
      />
    )
  }
}

export class BlueSpacing20 extends Component {
  render () {
    return (
      <View
        {...this.props}
        style={{height: 20, backgroundColor: BlueApp.settings.brandingColor}}
      />
    )
  }
}

export class BlueListView extends Component {
  render () {
    return (
      <ListView
        {...this.props}
      />
    )
  }
}

export class BlueList extends Component {
  render () {
    return (
      <List
        {...this.props}
        containerStyle={{backgroundColor: BlueApp.settings.brandingColor}}
      />
    )
  }
}

export class BlueView extends Component {
  render () {
    return (
      <View
        {...this.props}
        containerStyle={{backgroundColor: BlueApp.settings.brandingColor}}
      />
    )
  }
}

export class BlueLoading extends Component {
  render () {
    return (
      <SafeBlueArea >
        <View style={{flex: 1, paddingTop: 200}}>
          <ActivityIndicator />
        </View>
      </SafeBlueArea>
    )
  }
}
