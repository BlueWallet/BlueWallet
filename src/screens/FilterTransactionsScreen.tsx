import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DateObject } from 'react-native-calendars';
import { ScrollView } from 'react-native-gesture-handler';

import { images } from 'app/assets';
import { Header, ScreenTemplate, InputItem, Image } from 'app/components';
import { Button } from 'app/components/Button';
import { Calendar } from 'app/components/Calendar';
import { CardGroup } from 'app/components/CardGroup';
import { RowTemplate } from 'app/components/RowTemplate';
import { CONST, Route, MainCardStackNavigatorParams, TxType } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { AppStateManager } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

enum Index {
  From = 0,
  To = 1,
}

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
  route: RouteProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
}

const transactionStatusList = [TxType.RECOVERY, TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED, TxType.ALERT_RECOVERED];

export const FilterTransactionsScreen = (props: Props) => {
  const [address, setAddress] = useState('');
  const [dateKey, setDateKey] = useState(0);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [transactionType, setTransactionType] = useState(CONST.receive);
  const [transactionStatus, setTransactionStatus] = useState('');
  const { onFilterPress } = props.route.params;

  const onFilterButtonPress = () => {
    onFilterPress({
      address,
      dateKey,
      isCalendarVisible,
      fromDate,
      toDate,
      fromAmount,
      toAmount,
      transactionType,
      transactionStatus,
    });
    props.navigation.goBack();
  };

  const onDateSelect = (date: DateObject) => {
    setIsCalendarVisible(false);
    switch (dateKey) {
      case Index.From:
        return setFromDate(date.dateString);
      case Index.To:
        return setToDate(date.dateString);
    }
  };

  const showCalendar = (index: number) => {
    setIsCalendarVisible(true);
    setDateKey(index);
  };

  const closeCalendar = () => setIsCalendarVisible(false);

  const renderCommonCardContent = () => (
    <>
      <View style={styles.spacing10}>
        <AppStateManager handleAppComesToBackground={closeCalendar} />
        <RowTemplate
          items={[
            <View key={Index.From}>
              <InputItem
                key={Index.From}
                editable={false}
                label={i18n.filterTransactions.fromDate}
                value={fromDate}
                onFocus={() => showCalendar(Index.From)}
              />
              <TouchableOpacity
                key={`TouchableOpacity-${Index.From}`}
                onPress={() => showCalendar(Index.From)}
                style={styles.buttonOverlay}
              />
              {!!fromDate && (
                <TouchableOpacity style={styles.clearButton} onPress={() => setFromDate('')}>
                  <Image source={images.closeInverted} style={styles.clearImage} />
                </TouchableOpacity>
              )}
            </View>,
            <View key={Index.To}>
              <InputItem label={i18n.filterTransactions.toDate} value={toDate} editable={false} />
              <TouchableOpacity onPress={() => showCalendar(Index.To)} style={styles.buttonOverlay} />
              {!!toDate && (
                <TouchableOpacity style={styles.clearButton} onPress={() => setToDate('')}>
                  <Image source={images.closeInverted} style={styles.clearImage} />
                </TouchableOpacity>
              )}
            </View>,
          ]}
        />
      </View>
      <View>
        <RowTemplate
          items={[
            <InputItem
              key={Index.From}
              value={fromAmount}
              setValue={text => setFromAmount(text.replace(',', '.'))}
              label={i18n.filterTransactions.fromAmount}
              suffix="BTCV"
              keyboardType="numeric"
            />,
            <InputItem
              key={Index.To}
              value={toAmount}
              setValue={text => setToAmount(text.replace(',', '.'))}
              label={i18n.filterTransactions.toAmount}
              suffix="BTCV"
              keyboardType="numeric"
            />,
          ]}
        />
      </View>
    </>
  );

  const onContactPress = (data: string) => {
    const addressData = processAddressData(data);
    setAddress(addressData.address);
  };

  const navigateToChooseContactList = (title: string) =>
    props.navigation.navigate(Route.ChooseContactList, {
      onContactPress,
      title,
    });

  const returnStatusCopy = (txType: TxType) => {
    switch (txType) {
      case TxType.ALERT_PENDING:
        return i18n.filterTransactions.status.pending;
      case TxType.ALERT_RECOVERED:
        return i18n.filterTransactions.status.annulled;
      case TxType.ALERT_CONFIRMED:
        return i18n.filterTransactions.status.done;
      case TxType.RECOVERY:
        return i18n.filterTransactions.status.canceled;
      default:
        return '';
    }
  };

  const isStatusAtive = (status: string) => transactionStatus === status;

  const renderCardContent = (label: string) => (
    <View>
      <View style={styles.transactionStatusContainer}>
        <Text style={styles.groupTitle}>{i18n.filterTransactions.transactionStatus}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {transactionStatusList.map((status, index) => (
            <TouchableOpacity
              onPress={() => setTransactionStatus(isStatusAtive(status) ? '' : status)}
              key={index}
              style={[
                styles.statusContainer,
                { borderBottomColor: transactionStatus === status ? palette.secondary : palette.grey },
              ]}
            >
              <Text style={styles.filterText}>{returnStatusCopy(status)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.spacing20}>
        <InputItem label={label} value={address} editable={false} onChangeText={setAddress} />
        <Image style={styles.image} source={images.nextBlackArrow} />
        <TouchableOpacity onPress={() => navigateToChooseContactList(label)} style={styles.buttonOverlay} />
      </View>
      {renderCommonCardContent()}
    </View>
  );
  return (
    <ScreenTemplate
      footer={
        <>
          <Button title={i18n.filterTransactions.filter} onPress={onFilterButtonPress} />
        </>
      }
      header={<Header navigation={props.navigation} isBackArrow={true} title={i18n.filterTransactions.header} />}
    >
      <Calendar isVisible={isCalendarVisible} onDateSelect={onDateSelect} onClose={closeCalendar} />

      <CardGroup
        onCardPressAction={title =>
          setTransactionType(title === i18n.filterTransactions.sent ? CONST.send : CONST.receive)
        }
        label={i18n.filterTransactions.transactionType}
        cards={[
          {
            title: i18n.filterTransactions.received,
            content: renderCardContent(i18n.filterTransactions.from),
          },
          {
            title: i18n.filterTransactions.sent,
            content: renderCardContent(i18n.filterTransactions.to),
          },
        ]}
      />
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  spacing10: {
    marginBottom: 10,
  },
  spacing20: {
    marginBottom: 20,
  },
  transactionStatusContainer: {
    alignItems: 'center',
    marginHorizontal: -20,
    marginBottom: 20,
  },
  buttonOverlay: { position: 'absolute', height: '100%', width: '100%' },
  image: {
    width: 8,
    height: 13,
    top: 15,
    right: 10,
    position: 'absolute',
  },
  clearButton: { padding: 10, alignSelf: 'flex-end', position: 'absolute' },
  clearImage: { height: 25, width: 25 },
  filterText: {
    ...typography.caption,
  },
  groupTitle: {
    color: palette.textGrey,
    ...typography.subtitle4,
    marginBottom: 10,
  },
  statusContainer: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    marginHorizontal: 12,
  },
});
