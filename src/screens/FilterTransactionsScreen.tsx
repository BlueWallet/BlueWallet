import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DateObject } from 'react-native-calendars';
import { NavigationScreenProps } from 'react-navigation';

import { Header, ScreenTemplate, InputItem } from 'app/components';
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
            <InputItem
              key={Index.From}
              onFocus={() => showCalendar(Index.From)}
              label={i18n.filterTransactions.fromDate}
              value={fromDate}
            />,
            <InputItem
              key={Index.To}
              onFocus={() => showCalendar(Index.To)}
              label={i18n.filterTransactions.toDate}
              value={toDate}
            />,
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

  const renderReceiveCardContent = () => {
    return (
      <View>
        <View style={styles.spacing20}>
          <InputItem
            onFocus={() =>
              props.navigation.navigate(Route.ChooseContactList, {
                onContactPress,
                title: i18n.filterTransactions.from,
              })
            }
            label={i18n.filterTransactions.from}
            value={address}
            onChangeText={setAddress}
          />
        </View>
        {renderCommonCardContent()}
      </View>
    );
  };

  const renderSendCardContent = () => {
    return (
      <View>
        <View style={styles.spacing20}>
          <InputItem
            onFocus={() =>
              props.navigation.navigate(Route.ChooseContactList, {
                onContactPress,
                title: i18n.filterTransactions.to,
              })
            }
            label={i18n.filterTransactions.to}
            value={address}
            onChangeText={setAddress}
          />
        </View>
        {renderCommonCardContent()}
      </View>
    );
  };

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
          { title: i18n.filterTransactions.receive, content: renderReceiveCardContent() },
          { title: i18n.filterTransactions.send, content: renderSendCardContent() },
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
});
