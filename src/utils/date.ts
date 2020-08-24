import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(localizedFormat);

import { DateType } from 'app/consts';

dayjs.extend(duration);
dayjs.extend(utc);

export const secondsToFormat = (seconds: number, format: string) => {
  const d = dayjs.duration({ seconds });
  return dayjs.utc(d.asMilliseconds()).format(format);
};

export const formatDate = (date: DateType | string, format = 'DD/MM/YY') => dayjs(date).format(format);
