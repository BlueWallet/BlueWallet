import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { Text, View, StyleSheet, Linking, Clipboard } from 'react-native';

import { Header, Chip, ScreenTemplate, Button } from 'app/components';
import { RootStackParams, Route } from 'app/consts';
import { typography, palette } from 'app/styles';

import { BitcoinUnit } from '../../models/bitcoinUnits';
import { satoshiToBtc } from '../../utils/bitcoin';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.SendTransactionDetails>;
  route: RouteProp<RootStackParams, Route.SendTransactionDetails>;
}

export class SendTransactionDetailsScreen extends PureComponent<Props> {
  render() {
    const {
      navigation,
      route: { params },
    } = this.props;
    const {
      fee,
      tx,
      satoshiPerByte,
      recipients: [recipient],
    } = params;
    const txSize = Math.round(tx.length / 2);
    const amount = recipient.amount || satoshiToBtc(recipient.value).toString();

    return (
      <ScreenTemplate
        header={<Header title={i18n.transactions.details.details} isCancelButton={true} navigation={navigation} />}
      >
        <View style={styles.upperContainer}>
          <Text style={styles.title}>{i18n.transactions.details.transactionHex}</Text>
          <Text style={styles.description}>{i18n.transactions.details.transactionHexDescription}</Text>
          <Chip label={tx} textStyle={styles.txStyle} />
          <Button
            title={i18n.transactions.details.copyAndBoriadcast}
            containerStyle={styles.button}
            onPress={() => Clipboard.setString(tx)}
          />
          <Button
            title={i18n.transactions.details.verify}
            containerStyle={styles.button}
            onPress={() => {
              Linking.openURL('https://coinb.in/?verify=' + tx);
            }}
          />
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>{i18n.transactions.details.details}</Text>
          <Text style={styles.listItemTitle}>{i18n.transactions.details.to}</Text>
          <Text style={styles.listItemContent}>{recipient.address}</Text>
          <Text style={styles.listItemTitle}>{i18n.transactions.details.amount}</Text>
          <Text style={styles.listItemContent}>
            {amount} {BitcoinUnit.BTC}
          </Text>
          <Text style={styles.listItemTitle}>{i18n.transactions.details.fee}</Text>
          <Text style={styles.listItemContent}>
            {fee} {BitcoinUnit.BTC}
          </Text>
          <Text style={styles.listItemTitle}>{i18n.transactions.details.txSize}</Text>
          <Text style={styles.listItemContent}>
            {txSize} {i18n.transactions.details.bytes}
          </Text>
          <Text style={styles.listItemTitle}>{i18n.transactions.details.satoshiPerByte}</Text>
          <Text style={styles.listItemContent}>{satoshiPerByte}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  upperContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsContainer: {
    marginVertical: 20,
  },
  title: {
    ...typography.headline4,
    paddingVertical: 20,
  },
  detailsTitle: {
    ...typography.headline4,
    alignSelf: 'center',
  },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    paddingVertical: 20,
  },
  txStyle: {
    ...typography.headline5,
    lineHeight: 20,
    marginVertical: 5,
  },
  button: {
    marginVertical: 10,
    width: '100%',
  },
  listItemTitle: { ...typography.overline, color: palette.textGrey, marginTop: 24 },
  listItemContent: { ...typography.caption, marginTop: 4, marginBottom: 3 },
});
