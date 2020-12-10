import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DateObject } from 'react-native-calendars';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import {
  Header,
  ScreenTemplate,
  InputItem,
  Image,
  Label,
  FlatButton,
  Button,
  Calendar,
  CardGroup,
  RowTemplate,
} from 'app/components';
import { CONST, Route, MainCardStackNavigatorParams, Filters, Tags, TagsType } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { checkZero } from 'app/helpers/helpers';
import { AppStateManager } from 'app/services';
import { ApplicationState } from 'app/state';
import * as actions from 'app/state/filters/actions';
import * as selectors from 'app/state/filters/selectors';
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
  tags: TagsType[];
  activateFilters: () => actions.ActivateFiltersAction;
  updateAddress: (value: string) => actions.UpdateAddressAction;
  updateDateKey: (value: number) => actions.UpdateDateKeyAction;
  updateFromDate: (value: string) => actions.UpdateFromDateAction;
  updateToDate: (value: string) => actions.UpdateToDateAction;
  updateFromAmount: (value: string) => actions.UpdateFromAmountAction;
  updateToAmount: (value: string) => actions.UpdateToAmountAction;
  updateTransactionType: (value: string) => actions.UpdateTransactionTypeAction;
  toggleTransactionTag: (value: TagsType) => actions.ToggleTransactionTagAction;
  clearFilters: () => actions.ClearFiltersAction;
}

interface State {
  isCalendarVisible: boolean;
}

class FilterTransactionsScreen extends PureComponent<Props, State> {
  state = {
    isCalendarVisible: false,
  };

  get transactionTagsBase() {
    return [
      {
        tag: Tags.PENDING,
        text: i18n.filterTransactions.status.pending,
      },
      {
        tag: Tags.DONE,
        text: i18n.filterTransactions.status.done,
      },
      {
        tag: Tags['CANCELED-DONE'],
        text: i18n.filterTransactions.status.canceledDone,
      },
      {
        tag: Tags.CANCELED,
        text: i18n.filterTransactions.status.canceled,
      },
    ];
  }

  get transactionTagsReceived() {
    return this.transactionTagsBase;
  }

  get transactionTagsSent() {
    return [
      ...this.transactionTagsBase,
      {
        tag: Tags.BLOCKED,
        text: i18n.transactions.label.blocked,
      },
      {
        tag: Tags.UNBLOCKED,
        text: i18n.transactions.label.unblocked,
      },
    ];
  }

  get transactionTagsList() {
    return this.props.filters.transactionType === CONST.receive
      ? this.transactionTagsReceived
      : this.transactionTagsSent;
  }

  onFilterButtonPress = () => {
    this.props.activateFilters();
    this.props.route.params?.onFilterPress();
    this.props.navigation.goBack();
  };

  onDateSelect = (date: DateObject) => {
    this.setState({
      isCalendarVisible: false,
    });
    switch (this.props.filters.dateKey) {
      case Index.From:
        return this.props.updateFromDate(date.dateString);
      case Index.To:
        return this.props.updateToDate(date.dateString);
    }
  };

  showCalendar = (index: number) => {
    this.setState({
      isCalendarVisible: true,
    });
    this.props.updateDateKey(index);
  };

  closeCalendar = () => this.setState({ isCalendarVisible: false });

  validateAmount = (amount?: string) => {
    const a = Number(amount);
    if (Number.isNaN(a)) {
      return i18n._.invalid;
    }
    return '';
  };

  formatAmount = (amount: string, update: 'updateFromAmount' | 'updateToAmount') => {
    !this.validateAmount(amount) &&
      this.props[update](i18n.formatBalanceWithoutSuffix(Number(amount), undefined, true).toString());
  };

  renderCommonCardContent = () => {
    const { fromDate, toDate, fromAmount, toAmount } = this.props.filters;
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
                  <TouchableOpacity style={styles.clearButton} onPress={() => this.props.updateFromDate('')}>
                    <Image source={images.closeInverted} style={styles.clearImage} />
                  </TouchableOpacity>
                )}
              </View>,
              <View key={Index.To}>
                <InputItem label={i18n.filterTransactions.toDate} value={toDate} editable={false} />
                <TouchableOpacity onPress={() => this.showCalendar(Index.To)} style={styles.buttonOverlay} />
                {!!toDate && (
                  <TouchableOpacity style={styles.clearButton} onPress={() => this.props.updateToDate('')}>
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
                error={this.validateAmount(fromAmount)}
                setValue={text => this.props.updateFromAmount(checkZero(text))}
                label={i18n.filterTransactions.fromAmount}
                suffix="BTCV"
                keyboardType="numeric"
                onBlur={() => this.formatAmount(fromAmount!, 'updateFromAmount')}
              />,
              <InputItem
                key={Index.To}
                value={toAmount}
                error={this.validateAmount(toAmount)}
                setValue={text => this.props.updateToAmount(checkZero(text))}
                label={i18n.filterTransactions.toAmount}
                suffix="BTCV"
                keyboardType="numeric"
                onBlur={() => this.formatAmount(toAmount!, 'updateToAmount')}
              />,
            ]}
          />
        </View>
        <View style={styles.transactionStatusContainer}>
          <Text style={styles.groupTitle}>{i18n.filterTransactions.transactionStatus}</Text>
          <View style={styles.statusesContainer}>
            {this.transactionTagsList.map(({ tag, text }) => {
              const isActive = this.isTagActive(tag);
              return (
                <TouchableOpacity
                  onPress={() => this.props.toggleTransactionTag(tag)}
                  key={tag}
                  style={styles.statusContainer}
                  activeOpacity={1}
                >
                  <Label labelStyle={isActive ? styles.yellow : null}>{text}</Label>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  onContactPress = (data: string) => {
    const addressData = processAddressData(data);
    this.setAddress(addressData.address);
  };

  navigateToChooseContactList = (title: string) =>
    this.props.navigation.navigate(Route.ChooseContactList, {
      onContactPress: this.onContactPress,
      title,
    });

  isTagActive = (tag: TagsType) => this.props.tags.includes(tag);

  setAddress = (address: string) => {
    this.props.updateAddress(address);
  };

  renderCardContent = (label: string) => (
    <View>
      <View style={styles.spacing20}>
        <InputItem label={label} value={this.props.filters.address} editable={false} onChangeText={this.setAddress} />
        <Image style={styles.image} source={images.nextBlackArrow} />
        <TouchableOpacity onPress={() => this.navigateToChooseContactList(label)} style={styles.buttonOverlay} />
      </View>
      {this.renderCommonCardContent()}
    </View>
  );

  clearFilters = () => {
    this.props.clearFilters();
  };

  render() {
    return (
      <ScreenTemplate
        footer={
          <>
            <Button title={i18n.filterTransactions.filter} onPress={this.onFilterButtonPress} />
            <FlatButton
              containerStyle={styles.flatButton}
              title={i18n.filterTransactions.clearAll}
              onPress={this.clearFilters}
            />
          </>
        }
        header={<Header isBackArrow={true} title={i18n.filterTransactions.header} />}
      >
        <Calendar
          isVisible={this.state.isCalendarVisible}
          onDateSelect={this.onDateSelect}
          onClose={this.closeCalendar}
        />

        <CardGroup
          onCardPressAction={title =>
            this.props.updateTransactionType(title === i18n.filterTransactions.received ? CONST.receive : CONST.send)
          }
          label={i18n.filterTransactions.transactionType}
          cards={[
            { title: i18n.filterTransactions.received, content: this.renderCardContent(i18n.filterTransactions.from) },
            { title: i18n.filterTransactions.sent, content: this.renderCardContent(i18n.filterTransactions.to) },
          ]}
          activeTitle={
            this.props.filters.transactionType === CONST.receive
              ? i18n.filterTransactions.received
              : i18n.filterTransactions.sent
          }
        />
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  filters: state.filters,
  tags: selectors.getTags(state),
});

const mapDispatchToProps = {
  activateFilters: actions.activateFilters,
  updateAddress: actions.updateAddress,
  updateDateKey: actions.updateDateKey,
  updateFromDate: actions.updateFromDate,
  updateToDate: actions.updateToDate,
  updateFromAmount: actions.updateFromAmount,
  updateToAmount: actions.updateToAmount,
  updateTransactionType: actions.updateTransactionType,
  toggleTransactionTag: actions.toggleTransactionTag,
  clearFilters: actions.clearFilters,
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterTransactionsScreen);

const styles = StyleSheet.create({
  flatButton: {
    marginTop: 16,
  },
  spacing10: {
    marginBottom: 10,
  },
  spacing20: {
    marginBottom: 20,
  },
  transactionStatusContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  yellow: {
    backgroundColor: palette.textSecondary,
  },
  statusesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  buttonOverlay: { position: 'absolute', height: '100%', width: '100%' },
  image: {
    width: 8,
    height: 13,
    top: 30,
    right: 10,
    position: 'absolute',
  },
  clearButton: { padding: 10, alignSelf: 'flex-end', position: 'absolute', top: 20 },
  clearImage: { height: 25, width: 25 },
  groupTitle: {
    color: palette.textGrey,
    ...typography.caption,
    marginBottom: 10,
  },
  statusContainer: {
    paddingRight: 16,
    marginBottom: 16,
  },
});
