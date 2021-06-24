/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  TextInput,
  FlatList,
  ScrollView,
  Linking,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Icon } from 'react-native-elements';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import BigNumber from 'bignumber.js';
import { SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { isDesktop } from '../../blue_modules/environment';
const currency = require('../../blue_modules/currency');

export default class SendCreate extends Component {
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
      showAnimatedQr: props.route.params.showAnimatedQr ?? false,
      psbt: props.route.params.psbt,
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
        saveToFiles: isDesktop,
      })
        .catch(error => {
          console.log(error);
        })
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: loc.send.permission_storage_title,
        message: loc.send.permission_storage_message,
        buttonNeutral: loc.send.permission_storage_later,
        buttonNegative: loc._.cancel,
        buttonPositive: loc._.ok,
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.DownloadDirectoryPath + `/${fileName}`;
        try {
          await RNFS.writeFile(filePath, this.state.tx);
          alert(loc.formatString(loc.send.txSaved, { filePath }));
        } catch (e) {
          console.log(e);
          alert(e.message);
        }
      } else {
        console.log('Storage Permission: Denied');
        Alert.alert(loc.send.permission_storage_title, loc.send.permission_storage_denied_message, [
          {
            text: loc.send.open_settings,
            onPress: () => {
              Linking.openSettings();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ]);
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
          <Text style={styles.transactionDetailsTitle}>{loc.send.create_to}</Text>
          <Text style={styles.transactionDetailsSubtitle}>{item.address}</Text>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create_amount}</Text>
          <Text style={styles.transactionDetailsSubtitle}>
            {currency.satoshiToBTC(item.value)} {BitcoinUnit.BTC}
          </Text>
          {this.state.recipients.length > 1 && (
            <BlueText style={styles.itemOf}>
              {loc.formatString(loc._.of, { number: index + 1, total: this.state.recipients.length })}
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
              {this.state.showAnimatedQr && this.state.psbt ? <DynamicQRCode value={this.state.psbt.toHex()} /> : null}
              <BlueText style={styles.cardText}>{loc.send.create_this_is_hex}</BlueText>
              <TextInput testID="TxhexInput" style={styles.cardTx} height={72} multiline editable value={this.state.tx} />

              <TouchableOpacity accessibilityRole="button" style={styles.actionTouch} onPress={() => Clipboard.setString(this.state.tx)}>
                <Text style={styles.actionText}>{loc.send.create_copy}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.actionTouch}
                onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.tx)}
              >
                <Text style={styles.actionText}>{loc.send.create_verify}</Text>
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
              <Text style={styles.transactionDetailsTitle}>{loc.send.create_fee}</Text>
              <Text style={styles.transactionDetailsSubtitle}>
                {new BigNumber(this.state.fee).toFixed()} {BitcoinUnit.BTC}
              </Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create_tx_size}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.size} bytes</Text>

              <Text style={styles.transactionDetailsTitle}>{loc.send.create_satoshi_per_byte}</Text>
              <Text style={styles.transactionDetailsSubtitle}>{this.state.satoshiPerByte} Sat/B</Text>
              {this.state.memo.length > 0 && (
                <>
                  <Text style={styles.transactionDetailsTitle}>{loc.send.create_memo}</Text>
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
    color: BlueCurrentTheme.colors.feeText,
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    color: BlueCurrentTheme.colors.foregroundColor,
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
    backgroundColor: BlueCurrentTheme.colors.inputBorderColor,
    height: 0.5,
    marginVertical: 16,
  },
  root: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  card: {
    alignItems: 'center',
    flex: 1,
  },
  cardText: {
    color: BlueCurrentTheme.colors.foregroundColor,
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

SendCreate.navigationOptions = navigationStyle({}, (options, { theme, navigation, route }) => {
  let headerRight;
  if (route.params.exportTXN) {
    headerRight = () => (
      <TouchableOpacity accessibilityRole="button" style={styles.export} onPress={route.params.exportTXN}>
        <Icon size={22} name="share-alternative" type="entypo" color={BlueCurrentTheme.colors.foregroundColor} />
      </TouchableOpacity>
    );
  } else {
    headerRight = null;
  }

  return {
    ...options,
    headerRight,
    title: loc.send.create_details,
  };
});
