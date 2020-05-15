import React from 'react';
import { LocaleConfig, Calendar as RNCalendar, DateObject } from 'react-native-calendars';
import { Overlay } from 'react-native-elements';

const i18n = require('../../loc');

LocaleConfig.locales['en'] = {
  monthNames: [
    i18n.calendar.monthNames.january,
    i18n.calendar.monthNames.february,
    i18n.calendar.monthNames.march,
    i18n.calendar.monthNames.april,
    i18n.calendar.monthNames.may,
    i18n.calendar.monthNames.june,
    i18n.calendar.monthNames.july,
    i18n.calendar.monthNames.august,
    i18n.calendar.monthNames.september,
    i18n.calendar.monthNames.october,
    i18n.calendar.monthNames.november,
    i18n.calendar.monthNames.december,
  ],
  monthNamesShort: [
    i18n.calendar.monthNamesShort.january,
    i18n.calendar.monthNamesShort.february,
    i18n.calendar.monthNamesShort.march,
    i18n.calendar.monthNamesShort.april,
    i18n.calendar.monthNamesShort.may,
    i18n.calendar.monthNamesShort.june,
    i18n.calendar.monthNamesShort.july,
    i18n.calendar.monthNamesShort.august,
    i18n.calendar.monthNamesShort.september,
    i18n.calendar.monthNamesShort.october,
    i18n.calendar.monthNamesShort.november,
    i18n.calendar.monthNamesShort.december,
  ],
  dayNames: [
    i18n.calendar.dayNames.sunday,
    i18n.calendar.dayNames.monday,
    i18n.calendar.dayNames.tuesday,
    i18n.calendar.dayNames.wednesday,
    i18n.calendar.dayNames.thursday,
    i18n.calendar.dayNames.friday,
    i18n.calendar.dayNames.saturday,
  ],
  dayNamesShort: [
    i18n.calendar.dayNamesShort.sunday,
    i18n.calendar.dayNamesShort.monday,
    i18n.calendar.dayNamesShort.tuesday,
    i18n.calendar.dayNamesShort.wednesday,
    i18n.calendar.dayNamesShort.thursday,
    i18n.calendar.dayNamesShort.friday,
    i18n.calendar.dayNamesShort.saturday,
  ],
  today: i18n.calendar.today,
};
LocaleConfig.defaultLocale = 'en';

interface Props {
  isVisible: boolean;
  onDateSelect: (date: DateObject) => void;
}

export const Calendar = ({ isVisible, onDateSelect }: Props) => (
  <Overlay isVisible={isVisible}>
    <RNCalendar
      minDate={'2012-05-10'}
      onDayPress={day => onDateSelect(day)}
      firstDay={1}
      onPressArrowLeft={substractMonth => substractMonth()}
      onPressArrowRight={addMonth => addMonth()}
    />
  </Overlay>
);
