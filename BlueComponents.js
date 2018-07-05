/** @type {AppStorage} */
import React, { Component } from 'react';
import { SafeAreaView } from 'react-navigation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo';
import {
  Icon,
  Button,
  FormLabel,
  FormInput,
  Card,
  Text,
  Header,
  List,
  ListItem,
} from 'react-native-elements';
import {
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Carousel from 'react-native-snap-carousel';
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
    return (
      <Button
        activeOpacity={0.1}
        delayPressIn={0}
        {...this.props}
        style={{
          marginTop: 20,
          borderRadius: 6,
          borderWidth: 0.7,
          borderColor: 'transparent',
        }}
        borderRadius={10}
        backgroundColor="#ccddf9"
        color="#0c2550"
      />
    );
  }
  /* icon={{name: 'home', type: 'octicon'}} */
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
        style={{ color: BlueApp.settings.foregroundColor }}
      />
    );
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
    return (
      <FormLabel
        {...this.props}
        labelStyle={{ color: BlueApp.settings.foregroundColor }}
      />
    );
  }
}

export class BlueFormInput extends Component {
  render() {
    return (
      <FormInput
        {...this.props}
        inputStyle={{ color: BlueApp.settings.foregroundColor }}
        containerStyle={{
          borderBottomColor: BlueApp.settings.foregroundColor,
          borderBottomWidth: 0.5,
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
          color: BlueApp.settings.foregroundColor,
          fontSize: (isIpad && 10) || 12,
        }}
        containerStyle={{
          borderBottomColor: BlueApp.settings.foregroundColor,
          borderBottomWidth: 0.5,
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
                <Icon
                  name="times"
                  size={16}
                  type="font-awesome"
                  color={BlueApp.settings.foregroundColor}
                />
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
                <Icon
                  name="kebab-horizontal"
                  size={22}
                  type="octicon"
                  color={BlueApp.settings.foregroundColor}
                />
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
    return (
      <View
        {...this.props}
        style={{ height: 60, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
  }
}

export class BlueSpacing40 extends Component {
  render() {
    return (
      <View
        {...this.props}
        style={{ height: 50, backgroundColor: BlueApp.settings.brandingColor }}
      />
    );
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
            <Icon
              {...this.props}
              name="arrow-down"
              size={16}
              type="font-awesome"
              color="#37c0a1"
              iconStyle={{ left: 0, top: 8 }}
            />
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

export class BlueTransactionOutgoingIcon extends Component {
  render() {
    return (
      <View {...this.props} style={stylesBlueIcon.container}>
        <View style={stylesBlueIcon.boxIncomming}>
          <View style={stylesBlueIcon.ballOutgoing}>
            <Icon
              {...this.props}
              name="arrow-down"
              size={16}
              type="font-awesome"
              color="#d0021b"
              iconStyle={{ left: 0, top: 8 }}
            />
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
              <Icon
                {...this.props}
                name="arrow-down"
                size={16}
                type="font-awesome"
                color="#2f5fb3"
                iconStyle={{ left: 0, top: 15 }}
              />
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
              <Icon
                {...this.props}
                name="arrow-down"
                size={16}
                type="font-awesome"
                color="#2f5fb3"
                iconStyle={{ left: 0, top: 0 }}
              />
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
        <LinearGradient
          colors={['#65ceef', '#68bbe1']}
          style={{ padding: 15, borderRadius: 10, height: 145 }}
        >
          <Image
            source={require('./img/btc-shape.png')}
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
            {item.getBalance()} BTC
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
