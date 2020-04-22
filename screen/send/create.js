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
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle,
    title: loc.send.create.details,
    headerRight: navigation.state.params.exportTXN ? (
      <TouchableOpacity style={{ marginRight: 16 }} onPress={navigation.state.params.exportTXN}>
        <Icon size={22} name="share-alternative" type="entypo" color={BlueApp.settings.foregroundColor} />
      </TouchableOpacity>
    ) : null,
  });

  constructor(props) {
    super(props);
    console.log('send/create constructor');
    props.navigation.setParams({ exportTXN: this.exportTXN });
    this.state = {
      isLoading: false,
      fee: props.navigation.getParam('fee'),
      recipients: props.navigation.getParam('recipients'),
      memo: props.navigation.getParam('memo') || '',
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
      wallet: props.navigation.getParam('wallet'),
      feeSatoshi: props.navigation.getParam('feeSatoshi'),
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
            {item.amount === BitcoinUnit.MAX || !item.amount
              ? currency.satoshiToBTC(this.state.wallet.getBalance()) - this.state.fee
              : item.amount || currency.satoshiToBTC(item.value)}{' '}
            {BitcoinUnit.BTC}
          </Text>
          {this.state.recipients.length > 1 && (
            <BlueText style={{ alignSelf: 'flex-end' }}>
              {index + 1} of {this.state.recipients.length}
            </BlueText>
          )}
        </View>
      </>
    );
  };

  renderSeparator = () => {
    return <View style={{ backgroundColor: BlueApp.settings.inputBorderColor, height: 0.5, marginVertical: 16 }} />;
  };

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView>
            <BlueCard style={{ alignItems: 'center', flex: 1 }}>
              <BlueText style={{ color: '#0c2550', fontWeight: '500' }}>{loc.send.create.this_is_hex}</BlueText>
              <TextInput
                style={{
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
                }}
                height={72}
                multiline
                editable
                value={this.state.tx}
              />

              <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Clipboard.setString(this.state.tx)}>
                <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Copy and broadcast later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.tx)}>
                <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Verify on coinb.in</Text>
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
});

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    setParams: PropTypes.func,
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.number,
        address: PropTypes.string,
        memo: PropTypes.string,
      }),
    }),
  }),
};
