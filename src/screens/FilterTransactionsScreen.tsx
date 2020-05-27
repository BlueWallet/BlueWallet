import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { DateObject } from 'react-native-calendars';
import { NavigationScreenProps } from 'react-navigation';

import { images } from 'app/assets';
import { Header, ScreenTemplate, InputItem, Image } from 'app/components';
import { Button } from 'app/components/Button';
import { Calendar } from 'app/components/Calendar';
import { CardGroup } from 'app/components/CardGroup';
import { RowTemplate } from 'app/components/RowTemplate';
import { Route } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';

const i18n = require('../../loc');

enum Index {
  From = 0,
  To = 1,
}

export const FilterTransactionsScreen = (props: NavigationScreenProps) => {
  const [address, setAddress] = useState('');
  const [dateKey, setDateKey] = useState(0);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  const onFilterButtonPress = () => {};

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

  const renderCommonCardContent = () => (
    <>
      <View style={styles.spacing10}>
        <RowTemplate
          items={[
            <TouchableOpacity key={Index.From} onPress={() => showCalendar(Index.From)}>
              <InputItem key={Index.From} editable={false} label={i18n.filterTransactions.fromDate} value={fromDate} />
            </TouchableOpacity>,
            <TouchableOpacity key={Index.To} onPress={() => showCalendar(Index.To)}>
              <InputItem label={i18n.filterTransactions.toDate} value={toDate} editable={false} />
            </TouchableOpacity>,
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
        <TouchableOpacity onPress={() => navigateToChooseContactList(label)}>
          <InputItem label={label} value={address} editable={false} onChangeText={setAddress} />
          <Image style={styles.image} source={images.nextBlackArrow} />
        </TouchableOpacity>
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
    >
      <Calendar isVisible={isCalendarVisible} onDateSelect={onDateSelect} />
      <CardGroup
        cards={[
          { title: i18n.filterTransactions.receive, content: renderCardContent(i18n.filterTransactions.from) },
          { title: i18n.filterTransactions.send, content: renderCardContent(i18n.filterTransactions.to) },
        ]}
      />
    </ScreenTemplate>
  );
};

FilterTransactionsScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header navigation={props.navigation} isBackArrow={true} title={i18n.filterTransactions.header} />,
});

const styles = StyleSheet.create({
  spacing10: {
    marginBottom: 10,
  },
  spacing20: {
    marginBottom: 20,
  },
  image: {
    width: 8,
    height: 13,
    top: 28,
    left: '96%',
    position: 'absolute',
  },
});
