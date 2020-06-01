/* global alert */
import React, { Component } from 'react';
import {
  TextInput,
  FlatList,
  ScrollView,
  Linking,
  TouchableOpacity,
  Clipboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { BlueNavigationStyle, SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');
const currency = require('../../currency');

export default class SendCreate extends Component {
  static navigationOptions = ({ navigation, route }) => {
    let headerRight;
    if (route.params.exportTXN) {
      headerRight = () => (
        <TouchableOpacity style={styles.export} onPress={route.params.exportTXN}>
          <Icon size={22} name="share-alternative" type="entypo" color={BlueApp.settings.foregroundColor} />
        </TouchableOpacity>
      );
    } else {
      headerRight = null;
    }

    return {
      ...BlueNavigationStyle,
      title: loc.send.create.details,
      headerRight,
    };
  };

  constructor(props) {
    super(props);
    console.log('send/create constructor');
    props.navigation.setParams({ exportTXN: this.exportTXN });
    this.state = {
      isLoading: false,
      fee: props.route.params.fee,
      recipients: props.route.params.recipients,
      memo: props.route.params.memo || '',
      size: Math.round(props.route.params.tx.length / 2),
      tx: props.route.params.tx,
      satoshiPerByte: props.route.params.satoshiPerByte,
      wallet: props.route.params.wallet,
      feeSatoshi: props.route.params.feeSatoshi,
    };
  }

  componentDidMount() {
    Privacy.enableBlur();
    console.log('send/create - componentDidMount');
  }

  exportTXN = async () => {
    const fileName = `${Date.now()}.txn`;
    if (Platform.OS === 'ios') {
      const filePath = RNFS.TemporaryDirectoryPath + `/${fileName}`;
      await RNFS.writeFile(filePath, this.state.tx);
      Share.open({
        url: 'file://' + filePath,
      })
        .catch(error => console.log(error))
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: 'BlueWallet Storage Access Permission',
        message: 'BlueWallet needs your permission to access your storage to save this transaction.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.ExternalCachesDirectoryPath + `/${this.fileName}`;
        await RNFS.writeFile(filePath, this.state.tx);
        alert(`This transaction has been saved in ${filePath}`);
      } else {
        console.log('Storage Permission: Denied');
      }
    }
  };

  componentWillUnmount() {
    Privacy.disableBlur();
  }

  _renderItem = ({ index, item }) => {
    return (
      <>
        <View>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
          <Text style={styles.transactionDetailsSubtitle}>{item.address}</Text>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create.amount}</Text>
          <Text style={styles.transactionDetailsSubtitle}>
            {item.value === BitcoinUnit.MAX || !item.value
              ? currency.satoshiToBTC(this.state.wallet.getBalance()) - this.state.fee
              : currency.satoshiToBTC(item.value)}{' '}
            {BitcoinUnit.BTC}
          </Text>
          {this.state.recipients.length > 1 && (
            <BlueText style={styles.itemOf}>
              {index + 1} of {this.state.recipients.length}
            </BlueText>
          )}
        </View>
      </>
    );
  };

  renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  render() {
    return (
      <SafeBlueArea style={styles.root}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView>
            <BlueCard style={styles.card}>
              <BlueText style={styles.cardText}>{loc.send.create.this_is_hex}</BlueText>
              <TextInput testID={'TxhexInput'} style={styles.cardTx} height={72} multiline editable value={this.state.tx} />

              <TouchableOpacity style={styles.actionTouch} onPress={() => Clipboard.setString(this.state.tx)}>
                <Text style={styles.actionText}>Copy and broadcast later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionTouch} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.tx)}>
                <Text style={styles.actionText}>Verify on coinb.in</Text>
              </TouchableOpacity>
            </BlueCard>
            <BlueCard>
              <FlatList
                scrollEnabled={this.state.recipients.length > 1}
                extraData={this.state.recipients}
                data={this.state.recipients}
                renderItem={this._renderItem}
                keyExtractor={(_item, index) => `${index}`}
                ItemSeparatorComponent={this.renderSeparator}
              />
              <Text style={styles.transactionDetailsTitle}>{loc.send.create.fee}</Text>
              <Text style={styles.transactionDetailsSubtitle}>
                {this.state.fee} {BitcoinUnit.BTC}
              </Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.tx_size}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.size} bytes</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create.satoshi_per_byte}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.satoshiPerByte} Sat/B</Text>
              {this.state.memo.length > 0 && (
                <>
                  <Text style={styles.transactionDetailsTitle}>{loc.send.create.memo}</Text>
                  <Text style={styles.transactionDetailsSubtitle}>{this.state.memo}</Text>
                </>
              )}
            </BlueCard>
          </ScrollView>
        </TouchableWithoutFeedback>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    color: '#0c2550',
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    color: '#9aa0aa',
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  export: {
    marginRight: 16,
  },
  itemOf: {
    alignSelf: 'flex-end',
  },
  separator: {
    backgroundColor: BlueApp.settings.inputBorderColor,
    height: 0.5,
    marginVertical: 16,
  },
  root: {
    flex: 1,
    paddingTop: 19,
  },
  card: {
    alignItems: 'center',
    flex: 1,
  },
  cardText: {
    color: '#0c2550',
    fontWeight: '500',
  },
  cardTx: {
    borderColor: '#ebebeb',
    backgroundColor: '#d2f8d6',
    borderRadius: 4,
    marginTop: 20,
    color: '#37c0a1',
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  actionTouch: {
    marginVertical: 24,
  },
  actionText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
});

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    setParams: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};
