import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, ListRenderItemInfo } from 'react-native';
import Icon from '../../components/Icon';
import { satoshiToBTC } from '../../blue_modules/currency';
import BlueText from '../../components/BlueText';
import { writeFileAndExport } from '../../blue_modules/fs';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useSettings } from '../../hooks/context/useSettings';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { CreateTransactionTarget } from '../../class/wallets/types';

const SendCreate = () => {
  const {
    fee,
    recipients,
    memo = '',
    satoshiPerByte,
    psbt,
    showAnimatedQr,
    tx,
  } = useRoute<RouteProp<SendDetailsStackParamList, 'CreateTransaction'>>().params;
  const transaction = bitcoin.Transaction.fromHex(tx);
  const size = transaction.virtualSize();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();

  const styleHooks = StyleSheet.create({
    transactionDetailsTitle: {
      color: colors.feeText,
    },
    transactionDetailsSubtitle: {
      color: colors.foregroundColor,
    },
    separator: {
      backgroundColor: colors.inputBorderColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    cardText: {
      color: colors.foregroundColor,
    },
  });

  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  useEffect(() => {
    console.log('send/create - useEffect');
    if (isPrivacyBlurEnabled) {
      enableScreenProtect();
    }
    return () => {
      disableScreenProtect();
    };
  }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]);

  const exportTXN = useCallback(async () => {
    const fileName = `${Date.now()}.txn`;
    await writeFileAndExport(fileName, tx, false);
  }, [tx]);

  const renderHeaderRight = useCallback(
    () => (
      <Pressable accessibilityRole="button" onPress={exportTXN} style={({ pressed }) => pressed && styles.iconPressablePressed}>
        <Icon size={22} name="share-alternative" type="entypo" color={colors.foregroundColor} />
      </Pressable>
    ),
    [colors.foregroundColor, exportTXN],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const _renderItem = ({ index, item }: ListRenderItemInfo<CreateTransactionTarget>) => {
    return (
      <>
        <View>
          <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_to}</Text>
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{item.address}</Text>
          <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_amount}</Text>
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>
            {item.value != null ? `${satoshiToBTC(item.value)} ${BitcoinUnit.BTC}` : '-'}
          </Text>
          {recipients.length > 1 && (
            <BlueText style={styles.itemOf}>{loc.formatString(loc._.of, { number: index + 1, total: recipients.length })}</BlueText>
          )}
        </View>
      </>
    );
  };

  const renderSeparator = () => {
    return <View style={[styles.separator, styleHooks.separator]} />;
  };

  const ListHeaderComponent = (
    <View>
      {showAnimatedQr && psbt ? (
        <>
          <BlueSpacing20 />
          <DynamicQRCode value={psbt.toHex()} />
          <BlueSpacing20 />
        </>
      ) : null}
      <BlueText style={[styles.cardText, styleHooks.cardText]}>{loc.send.create_this_is_hex}</BlueText>
      <TextInput testID="TxhexInput" style={styles.cardTx} multiline editable={false} value={tx} />

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.actionTouch, pressed && styles.actionTouchPressed]}
        onPress={() => Clipboard.setString(tx)}
      >
        <Text style={styles.actionText}>{loc.send.create_copy}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.actionTouch, pressed && styles.actionTouchPressed]}
        onPress={() => Linking.openURL('https://coinb.in/?verify=' + tx)}
      >
        <Text style={styles.actionText}>{loc.send.create_verify}</Text>
      </Pressable>
    </View>
  );

  const ListFooterComponent = (
    <View>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_fee}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>
        {new BigNumber(fee).toFixed()} {BitcoinUnit.BTC}
      </Text>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_tx_size}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{size} vbytes</Text>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_satoshi_per_vbyte}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{satoshiPerByte} Sat/vB</Text>
      {memo?.length > 0 && (
        <>
          <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_memo}</Text>
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{memo}</Text>
        </>
      )}
    </View>
  );

  return (
    <FlatList<CreateTransactionTarget>
      contentContainerStyle={[styles.root, styleHooks.root]}
      extraData={recipients}
      data={recipients}
      renderItem={_renderItem}
      keyExtractor={(_item, index) => `${index}`}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    />
  );
};

export default SendCreate;

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  root: {
    paddingHorizontal: 20,
  },
  transactionDetailsSubtitle: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  itemOf: {
    alignSelf: 'flex-end',
  },
  separator: {
    height: 0.5,
    marginVertical: 16,
  },
  cardText: {
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
    height: 72,
  },
  actionTouch: {
    marginVertical: 24,
  },
  actionTouchPressed: {
    opacity: 0.7,
  },
  iconPressablePressed: {
    opacity: 0.6,
  },
  actionText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
});
