/** @type {AppStorage} */
import React, { Component } from 'react';
import { SafeAreaView } from 'react-navigation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient, Constants } from 'expo';
import { Icon, Button, FormLabel, FormInput, Card, Text, Header, List, ListItem } from 'react-native-elements';
import { TouchableOpacity, ActivityIndicator, View, StyleSheet, Dimensions, Image } from 'react-native';
import { WatchOnlyWallet, LegacyWallet } from './class';
import Carousel from 'react-native-snap-carousel';
import { HDLegacyP2PKHWallet } from './class/hd-legacy-p2pkh-wallet';
import { HDLegacyBreadwalletWallet } from './class/hd-legacy-breadwallet-wallet';
import { HDSegwitP2SHWallet } from './class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from './class/lightning-custodian-wallet';
let loc = require('./loc/');
/** @type {AppStorage} */
let BlueApp = require('./BlueApp');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export class BlueButton extends Component {
  render() {
    // eslint-disable-next-line
    this.props.buttonStyle = this.props.buttonStyle || {};

    return (
      <Button
        activeOpacity={0.1}
        delayPressIn={0}
        {...this.props}
        style={{
          marginTop: 20,
          borderWidth: 0.7,
          borderColor: 'transparent',
        }}
        buttonStyle={Object.assign(
          {
            backgroundColor: '#ccddf9',
            height: 45,
            borderWidth: 0,
            borderRadius: 25,
          },
          this.props.buttonStyle,
        )}
        color="#0c2550"
      />
    );
  }
}

export class BitcoinButton extends Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => {
          // eslint-disable-next-line
          if (this.props.onPress) this.props.onPress();
        }}
      >
        <View
          style={{
            // eslint-disable-next-line
            borderColor: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2',
            borderWidth: 0.5,
            borderRadius: 5,
            backgroundColor: '#f5f5f5',
            // eslint-disable-next-line
            width: this.props.style.width,
            // eslint-disable-next-line
            height: this.props.style.height,
          }}
        >
          <View style={{ paddingTop: 30 }}>
            <Icon name="btc" size={32} type="font-awesome" color={(this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2'} />
            <Text style={{ textAlign: 'center', color: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2' }}>
              {loc.wallets.add.bitcoin}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class LightningButton extends Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => {
          // eslint-disable-next-line
          if (this.props.onPress) this.props.onPress();
        }}
      >
        <View
          style={{
            // eslint-disable-next-line
            borderColor: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2',
            borderWidth: 0.5,
            borderRadius: 5,
            backgroundColor: '#f5f5f5',
            // eslint-disable-next-line
            width: this.props.style.width,
            // eslint-disable-next-line
            height: this.props.style.height,
          }}
        >
          <View style={{ paddingTop: 30 }}>
            <Icon name="bolt" size={32} type="font-awesome" color={(this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2'} />
            <Text style={{ textAlign: 'center', color: (this.props.active && BlueApp.settings.foregroundColor) || '#d2d2d2' }}>
              {loc.wallets.add.lightning}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueButtonLink extends Component {
  render() {
    // eslint-disable-next-line
    this.props.buttonStyle = this.props.buttonStyle || {};

    return (
      <Button
        activeOpacity={0.1}
        delayPressIn={0}
        {...this.props}
        style={{
          marginTop: 20,
          borderWidth: 0.7,
          borderColor: 'transparent',
        }}
        buttonStyle={{
          height: 25,
          width: width / 1.5,
        }}
        backgroundColor="transparent"
        color="#0c2550"
      />
    );
  }
}

export class SafeBlueArea extends Component {
  render() {
    return (
      <SafeAreaView
        {...this.props}
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueCard extends Component {
  render() {
    return (
      <Card
        {...this.props}
        titleStyle={{ color: BlueApp.settings.foregroundColor }}
        containerStyle={{
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          paddingTop: 0,
          marginTop: 0,
        }}
        dividerStyle={{
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        }}
        wrapperStyle={{ backgroundColor: 'transparent' }}
      />
    );
  }
}

export class BlueText extends Component {
  render() {
    return (
      <Text
        {...this.props}
        style={Object.assign(
          {
            color: BlueApp.settings.foregroundColor,
          },
          // eslint-disable-next-line
          this.props.style,
        )}
      />
    );
  }
}
export class BlueTextCentered extends Component {
  render() {
    return <Text {...this.props} style={{ color: BlueApp.settings.foregroundColor, textAlign: 'center' }} />;
  }
}

export class BlueListItem extends Component {
  render() {
    return (
      <ListItem
        {...this.props}
        containerStyle={{
          backgroundColor: 'transparent',
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        titleStyle={{
          color: BlueApp.settings.foregroundColor,
          fontSize: 16,
          fontWeight: '500',
        }}
        subtitleStyle={{ color: '#9aa0aa' }}
      />
    );
  }
}

export class BlueFormLabel extends Component {
  render() {
    return <FormLabel {...this.props} labelStyle={{ color: BlueApp.settings.foregroundColor, fontWeight: '400' }} />;
  }
}

export class BlueFormInput extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{ color: BlueApp.settings.foregroundColor, maxWidth: width - 105 }}
        containerStyle={{
          marginTop: 5,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }
}

export class BlueFormMultiInput extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        multiline
        numberOfLines={4}
        inputStyle={{
          width: width - 40,
          color: BlueApp.settings.foregroundColor,
          height: 120,
          fontSize: (isIpad && 10) || ((is.iphone8() && 12) || 14),
        }}
        containerStyle={{
          marginTop: 5,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }
}

export class BlueFormInputAddress extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{
          maxWidth: width - 110,
          color: BlueApp.settings.foregroundColor,
          fontSize: (isIpad && 10) || ((is.iphone8() && 12) || 14),
        }}
        containerStyle={{
          marginTop: 5,
          borderColor: '#d2d2d2',
          borderBottomColor: '#d2d2d2',
          borderWidth: 0.5,
          borderBottomWidth: 0.5,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }
}

export class BlueHeader extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor="transparent"
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        statusBarProps={{ barStyle: 'default' }}
      />
    );
  }
}

export class BlueHeaderDefaultSub extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor="transparent"
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        statusBarProps={{ barStyle: 'default' }}
        leftComponent={
          <Text
            style={{
              fontWeight: 'bold',
              fontSize: 34,
              color: BlueApp.settings.foregroundColor,
            }}
          >
            {
              // eslint-disable-next-line
              this.props.leftText
            }
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={() => {
              // eslint-disable-next-line
              if (this.props.onClose) this.props.onClose();
            }}
          >
            <View style={stylesBlueIcon.box}>
              <View style={stylesBlueIcon.ballTransparrent}>
                <Icon name="times" size={16} type="font-awesome" color={BlueApp.settings.foregroundColor} />
              </View>
            </View>
          </TouchableOpacity>
        }
      />
    );
  }
}

export class BlueHeaderDefaultMain extends Component {
  render() {
    return (
      <Header
        {...this.props}
        backgroundColor="transparent"
        outerContainerStyles={{
          borderBottomColor: 'transparent',
          borderBottomWidth: 0,
        }}
        statusBarProps={{ barStyle: 'default' }}
        leftComponent={
          <Text
            style={{
              fontWeight: 'bold',
              fontSize: 34,
              color: BlueApp.settings.foregroundColor,
            }}
          >
            {
              // eslint-disable-next-line
              this.props.leftText
            }
          </Text>
        }
        rightComponent={
          <TouchableOpacity
            onPress={() => {
              // eslint-disable-next-line
              if (this.props.onClose) this.props.onClose();
            }}
          >
            <View style={stylesBlueIcon.box}>
              <View style={stylesBlueIcon.ballTransparrent}>
                <Icon name="kebab-horizontal" size={22} type="octicon" color={BlueApp.settings.foregroundColor} />
              </View>
            </View>
          </TouchableOpacity>
        }
      />
    );
  }
}

export class BlueSpacing extends Component {
  render() {
    return <View {...this.props} style={{ height: 60, backgroundColor: BlueApp.settings.brandingColor }} />;
  }
}

export class BlueSpacing40 extends Component {
  render() {
    return <View {...this.props} style={{ height: 50, backgroundColor: BlueApp.settings.brandingColor }} />;
  }
}

export class BlueSpacingVariable extends Component {
  render() {
    if (isIpad) {
      return <BlueSpacing40 {...this.props} />;
    } else {
      return <BlueSpacing {...this.props} />;
    }
  }
}

export class is {
  static ipad() {
    return isIpad;
  }

  static iphone8() {
    return Constants.platform.ios.platform === 'iPhone10,4';
  }
}

export class BlueSpacing20 extends Component {
  render() {
    return <View {...this.props} style={{ height: 20, opacity: 0 }} />;
  }
}

export class BlueList extends Component {
  render() {
    return (
      <List
        {...this.props}
        containerStyle={{
          backgroundColor: BlueApp.settings.brandingColor,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
        }}
      />
    );
  }
}

export class BlueLoading extends Component {
  render() {
    return (
      <SafeBlueArea>
        <View style={{ flex: 1, paddingTop: 200 }}>
          <ActivityIndicator />
        </View>
      </SafeBlueArea>
    );
  }
}

const stylesBlueIcon = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerRefresh: {
    flex: 1,
    position: 'absolute',
    right: 10,
  },
  box1: {
    position: 'relative',
    top: 15,
  },
  box: {
    position: 'relative',
  },
  boxIncomming: {
    position: 'relative',
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccddf9',
  },
  ballIncomming: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d2f8d6',
    transform: [{ rotate: '-45deg' }],
  },
  ballReceive: {
    width: 30,
    height: 30,
    borderBottomLeftRadius: 15,
    backgroundColor: '#d2f8d6',
    transform: [{ rotate: '-45deg' }],
  },
  ballOutgoing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8d2d2',
    transform: [{ rotate: '225deg' }],
  },
  ballTransparrent: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  ballDimmed: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'gray',
  },
});
export class BluePlusIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.box1}>
          <View style={stylesBlueIcon.ball}>
            <Ionicons
              {...this.props}
              name={'ios-add'}
              size={26}
              style={{
                color: BlueApp.settings.foregroundColor,
                backgroundColor: 'transparent',
                left: 8,
                top: 1,
              }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueRefreshIcon extends Component {
  render() {
    return (
      <TouchableOpacity {...this.props} style={stylesBlueIcon.containerRefresh}>
        <View style={stylesBlueIcon.box1}>
          <View style={stylesBlueIcon.ballTransparrent}>
            <Ionicons
              {...this.props}
              name={'ios-refresh'}
              size={30}
              style={{
                color: BlueApp.settings.foregroundColor,
                backgroundColor: 'transparent',
                left: 8,
                top: 2,
              }}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueTransactionIncommingIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballIncomming}>
            <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#37c0a1" iconStyle={{ left: 0, top: 8 }} />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionPendingIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.box}>
          <View style={stylesBlueIcon.ball}>
            <Icon
              {...this.props}
              name="ellipsis-h"
              size={16}
              type="font-awesome"
              color={BlueApp.settings.foregroundColor}
              iconStyle={{ left: 0, top: 6 }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOnchainIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballIncomming}>
            <Icon
              {...this.props}
              name="link"
              size={16}
              type="font-awesome"
              color="#37c0a1"
              iconStyle={{ left: 0, top: 7, transform: [{ rotate: '-45deg' }] }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class BlueTransactionOutgoingIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballOutgoing}>
            <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#d0021b" iconStyle={{ left: 0, top: 8 }} />
          </View>
        </View>
      </View>
    );
  }
}

//

export class BlueReceiveButtonIcon extends Component {
  render() {
    return (
      <TouchableOpacity
        {...this.props}
        style={{
          flex: 1,
          position: 'absolute',
          bottom: 30,
          right: width / 2 + 5,
        }}
      >
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              width: 100,
              height: 40,
              position: 'relative',
              backgroundColor: '#ccddf9',
              borderBottomLeftRadius: 15,
              borderTopLeftRadius: 15,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderBottomLeftRadius: 15,
                backgroundColor: 'transparent',
                transform: [{ rotate: '-45deg' }],
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" iconStyle={{ left: 0, top: 15 }} />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                left: 5,
                top: 12,
                backgroundColor: 'transparent',
                position: 'relative',
              }}
            >
              {loc.receive.list.header}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BlueSendButtonIcon extends Component {
  render() {
    return (
      <TouchableOpacity
        {...this.props}
        style={{
          flex: 1,
          position: 'absolute',
          bottom: 30,
          left: width / 2 + 5,
        }}
      >
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              width: 110,
              height: 40,
              position: 'relative',
              backgroundColor: '#ccddf9',
              borderBottomRightRadius: 15,
              borderTopRightRadius: 15,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                left: 5,
                borderBottomLeftRadius: 15,
                backgroundColor: 'transparent',
                transform: [{ rotate: '225deg' }],
              }}
            >
              <Icon {...this.props} name="arrow-down" size={16} type="font-awesome" color="#2f5fb3" iconStyle={{ left: 0, top: 0 }} />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                left: 5,
                top: 12,
                backgroundColor: 'transparent',
                position: 'relative',
              }}
            >
              {loc.send.list.header}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class ManageFundsBigButton extends Component {
  render() {
    return (
      <TouchableOpacity
        {...this.props}
        style={{
          flex: 1,
          position: 'absolute',
          bottom: 30,
          left: (width - 190) / 2,
        }}
      >
        <View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              width: 190,
              height: 40,
              position: 'relative',
              backgroundColor: '#ccddf9',
              borderBottomRightRadius: 15,
              borderBottomLeftRadius: 15,
              borderTopRightRadius: 15,
              borderTopLeftRadius: 15,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                left: 20,
                top: 5,
                borderBottomLeftRadius: 15,
                backgroundColor: 'transparent',
                transform: [{ rotate: '90deg' }],
              }}
            >
              <Icon {...this.props} name="link" size={16} type="font-awesome" color="#2f5fb3" iconStyle={{ left: 0, top: 0 }} />
            </View>
            <Text
              style={{
                color: '#2f5fb3',
                fontSize: (isIpad && 10) || 16,
                fontWeight: '500',
                left: 25,
                top: 12,
                backgroundColor: 'transparent',
                position: 'relative',
              }}
            >
              manage funds
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export class BluePlusIconDimmed extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.box1}>
          <View style={stylesBlueIcon.ballDimmed}>
            <Ionicons
              {...this.props}
              name={'ios-add'}
              size={26}
              style={{
                color: 'white',
                backgroundColor: 'transparent',
                left: 8,
                top: 1,
              }}
            />
          </View>
        </View>
      </View>
    );
  }
}

export class NewWalletPannel extends Component {
  constructor(props) {
    super(props);
    // WalletsCarousel.handleClick = props.handleClick // because cant access `this` from _renderItem
    // eslint-disable-next-line
    this.handleClick = props.onPress;
  }

  render() {
    return (
      <TouchableOpacity
        {...this.props}
        style={{ paddingRight: 10, left: -20, paddingTop: 20 }}
        onPress={() => {
          if (this.handleClick) {
            this.handleClick();
          }
        }}
      >
        <LinearGradient
          colors={['#eef0f4', '#eef0f4']}
          style={{
            padding: 15,
            borderRadius: 10,
            height: 145,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BluePlusIconDimmed />
          <Text
            style={{
              backgroundColor: 'transparent',
              fontWeight: 'bold',
              fontSize: 20,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet}
          </Text>
          <Text style={{ backgroundColor: 'transparent' }} />
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet1}
          </Text>
          <Text
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#9aa0aa',
            }}
          >
            {loc.wallets.list.create_a_wallet2}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
}

let sliderWidth = width * 1;
let itemWidth = width * 0.82;
let sliderHeight = 175;

export class WalletsCarousel extends Component {
  constructor(props) {
    super(props);
    // eslint-disable-next-line
    WalletsCarousel.handleClick = props.handleClick; // because cant access `this` from _renderItem
    // eslint-disable-next-line
    this.onSnapToItem = props.onSnapToItem;
  }

  _renderItem({ item, index }) {
    if (!item) {
      return (
        <NewWalletPannel
          onPress={() => {
            if (WalletsCarousel.handleClick) {
              WalletsCarousel.handleClick(index);
            }
          }}
        />
      );
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
      <TouchableOpacity
        activeOpacity={1}
        style={{ paddingRight: 10, left: -20, paddingTop: 20 }}
        onPress={() => {
          if (WalletsCarousel.handleClick) {
            WalletsCarousel.handleClick(index);
          }
        }}
      >
        <LinearGradient colors={[gradient1, gradient2]} style={{ padding: 15, borderRadius: 10, height: 145 }}>
          <Image
            source={(new LightningCustodianWallet().type === item.type && require('./img/lnd-shape.png')) || require('./img/btc-shape.png')}
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
            style={{
              backgroundColor: 'transparent',
              fontSize: 19,
              color: '#fff',
            }}
          >
            {item.getLabel()}
          </Text>
          <Text
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
            style={{
              backgroundColor: 'transparent',
              fontSize: 13,
              color: '#fff',
            }}
          >
            {loc.wallets.list.latest_transaction}
          </Text>
          <Text
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
    );
  }

  render() {
    return (
      <View style={{ height: sliderHeight }}>
        <Carousel
          {...this.props}
          ref={c => {
            WalletsCarousel.carousel = c;
          }}
          renderItem={this._renderItem}
          sliderWidth={sliderWidth}
          itemWidth={itemWidth}
          inactiveSlideScale={1}
          inactiveSlideOpacity={0.7}
          onSnapToItem={index => {
            if (this.onSnapToItem) {
              this.onSnapToItem(index);
            }
            console.log('snapped to card #', index);
          }}
        />
      </View>
    );
  }
}
