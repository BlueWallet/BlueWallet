import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { DateObject } from 'react-native-calendars';

import { images } from 'app/assets';
import { Header, ScreenTemplate, InputItem, Image } from 'app/components';
import { Button } from 'app/components/Button';
import { Calendar } from 'app/components/Calendar';
import { CardGroup } from 'app/components/CardGroup';
import { RowTemplate } from 'app/components/RowTemplate';
import { CONST, Route, MainCardStackNavigatorParams } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { AppStateManager } from 'app/services';

const i18n = require('../../loc');

enum Index {
  From = 0,
  To = 1,
}

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
  route: RouteProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
}

export const FilterTransactionsScreen = (props: Props) => {
  const [address, setAddress] = useState('');
  const [dateKey, setDateKey] = useState(0);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [transactionType, setTransactionType] = useState(CONST.receive);
  const { onFilterPress } = props.route.params;

  const onFilterButtonPress = () => {
    onFilterPress({ address, dateKey, isCalendarVisible, fromDate, toDate, fromAmount, toAmount, transactionType });
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
                key={Index.From}
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

  const renderCardContent = (label: string) => (
    <View>
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
        onCardPressAction={title => setTransactionType(title)}
        cards={[
          { title: CONST.receive, content: renderCardContent(i18n.filterTransactions.from) },
          { title: CONST.send, content: renderCardContent(i18n.filterTransactions.to) },
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
});
