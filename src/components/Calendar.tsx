import React from 'react';
import { LocaleConfig, Calendar as RNCalendar, DateObject } from 'react-native-calendars';
import { Overlay } from 'react-native-elements';

const i18n = require('../../loc');

LocaleConfig.locales['en'] = i18n.getListOfMonthsAndWeekdays();
LocaleConfig.defaultLocale = 'en';

interface Props {
  isVisible: boolean;
  onDateSelect: (date: DateObject) => void;
}

export const Calendar = ({ isVisible, onDateSelect }: Props) => (
  <Overlay isVisible={isVisible}>
    <RNCalendar minDate={'2019-12-12'} onDayPress={onDateSelect} firstDay={1} />
  </Overlay>
);
