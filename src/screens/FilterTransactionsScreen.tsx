import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DateObject } from 'react-native-calendars';
import { ScrollView } from 'react-native-gesture-handler';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, ScreenTemplate, InputItem, Image } from 'app/components';
import { Button } from 'app/components/Button';
import { Calendar } from 'app/components/Calendar';
import { CardGroup } from 'app/components/CardGroup';
import { RowTemplate } from 'app/components/RowTemplate';
import { CONST, Route, MainCardStackNavigatorParams, TxType, Filters } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { AppStateManager } from 'app/services';
import { ApplicationState } from 'app/state';
import { UpdateFiltersAction, updateFilters } from 'app/state/filters/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

enum Index {
  From = 0,
  To = 1,
}

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
  route: RouteProp<MainCardStackNavigatorParams, Route.FilterTransactions>;
  filters: Filters;
  updateFilters: (filters: Filters) => UpdateFiltersAction;
}

interface State {
  derived: boolean;
  address: string;
  dateKey: number;
  isCalendarVisible: boolean;
  fromDate: string;
  toDate: string;
  fromAmount: string;
  toAmount: string;
  transactionType: string;
  transactionStatus: string;
}

const transactionStatusList = [TxType.RECOVERY, TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED, TxType.ALERT_RECOVERED];

class FilterTransactionsScreen extends PureComponent<Props, State> {
  state = {
    derived: false,
    address: '',
    dateKey: 0,
    isCalendarVisible: false,
    fromDate: '',
    toDate: '',
    fromAmount: '',
    toAmount: '',
    transactionType: CONST.receive,
    transactionStatus: '',
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    if (!state.derived) {
      return {
        ...props.filters,
        derived: true,
      };
    }
    return null;
  }

  onFilterButtonPress = () => {
    const {
      address,
      dateKey,
      isCalendarVisible,
      fromDate,
      toDate,
      fromAmount,
      toAmount,
      transactionType,
      transactionStatus,
    } = this.state;
    this.props.updateFilters({
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
    this.props.route.params?.onFilterPress();
    this.props.navigation.goBack();
  };

  onDateSelect = (date: DateObject) => {
    this.setState({
      isCalendarVisible: false,
    });
    switch (this.props.filters.dateKey) {
      case Index.From:
        return this.setState({
          fromDate: date.dateString,
        });
      case Index.To:
        return this.setState({
          toDate: date.dateString,
        });
    }
  };

  showCalendar = (index: number) => {
    this.setState({
      isCalendarVisible: true,
      dateKey: index,
    });
  };

  closeCalendar = () => this.setState({ isCalendarVisible: false });

  renderCommonCardContent = () => {
    const { fromDate, toDate, fromAmount, toAmount } = this.state;

    return (
      <>
        <View style={styles.spacing10}>
          <AppStateManager handleAppComesToBackground={this.closeCalendar} />
          <RowTemplate
            items={[
              <View key={Index.From}>
                <InputItem
                  key={Index.From}
                  editable={false}
                  label={i18n.filterTransactions.fromDate}
                  value={fromDate}
                  onFocus={() => this.showCalendar(Index.From)}
                />
                <TouchableOpacity
                  key={`TouchableOpacity-${Index.From}`}
                  onPress={() => this.showCalendar(Index.From)}
                  style={styles.buttonOverlay}
                />
                {!!fromDate && (
                  <TouchableOpacity style={styles.clearButton} onPress={() => this.setState({ fromDate: '' })}>
                    <Image source={images.closeInverted} style={styles.clearImage} />
                  </TouchableOpacity>
                )}
              </View>,
              <View key={Index.To}>
                <InputItem label={i18n.filterTransactions.toDate} value={toDate} editable={false} />
                <TouchableOpacity onPress={() => this.showCalendar(Index.To)} style={styles.buttonOverlay} />
                {!!toDate && (
                  <TouchableOpacity style={styles.clearButton} onPress={() => this.setState({ toDate: '' })}>
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
                setValue={text => this.setState({ fromAmount: text.replace(',', '.') })}
                label={i18n.filterTransactions.fromAmount}
                suffix="BTCV"
                keyboardType="numeric"
              />,
              <InputItem
                key={Index.To}
                value={toAmount}
                setValue={text => this.setState({ toAmount: text.replace(',', '.') })}
                label={i18n.filterTransactions.toAmount}
                suffix="BTCV"
                keyboardType="numeric"
              />,
            ]}
          />
        </View>
      </>
    );
  };

  onContactPress = (data: string) => {
    const addressData = processAddressData(data);
    this.setState({
      address: addressData.address,
    });
  };

  navigateToChooseContactList = (title: string) =>
    this.props.navigation.navigate(Route.ChooseContactList, {
      onContactPress: this.onContactPress,
      title,
    });

  returnStatusCopy = (txType: TxType) => {
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

  isStatusAtive = (status: string) => this.state.transactionStatus === status;

  setAddress = (address: string) => {
    this.setState({
      address,
    });
  };

  renderCardContent = (label: string) => (
    <View>
      <View style={styles.transactionStatusContainer}>
        <Text style={styles.groupTitle}>{i18n.filterTransactions.transactionStatus}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {transactionStatusList.map((status, index) => (
            <TouchableOpacity
              onPress={() => this.setState({ transactionStatus: this.isStatusAtive(status) ? '' : status })}
              key={index}
              style={[
                styles.statusContainer,
                { borderBottomColor: this.state.transactionStatus === status ? palette.secondary : palette.grey },
              ]}
            >
              <Text style={styles.filterText}>{this.returnStatusCopy(status)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.spacing20}>
        <InputItem label={label} value={this.state.address} editable={false} onChangeText={this.setAddress} />
        <Image style={styles.image} source={images.nextBlackArrow} />
        <TouchableOpacity onPress={() => this.navigateToChooseContactList(label)} style={styles.buttonOverlay} />
      </View>
      {this.renderCommonCardContent()}
    </View>
  );
  render() {
    return (
      <ScreenTemplate
        footer={
          <>
            <Button title={i18n.filterTransactions.filter} onPress={this.onFilterButtonPress} />
          </>
        }
        header={<Header navigation={this.props.navigation} isBackArrow={true} title={i18n.filterTransactions.header} />}
      >
        <Calendar
          isVisible={this.state.isCalendarVisible}
          onDateSelect={this.onDateSelect}
          onClose={this.closeCalendar}
        />

        <CardGroup
          onCardPressAction={title => this.setState({ transactionType: title })}
          label={i18n.filterTransactions.transactionType}
          cards={[
            { title: CONST.receive, content: this.renderCardContent(i18n.filterTransactions.from) },
            { title: CONST.send, content: this.renderCardContent(i18n.filterTransactions.to) },
          ]}
        />
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  filters: state.filters,
});

const mapDispatchToProps = {
  updateFilters,
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterTransactionsScreen);

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
