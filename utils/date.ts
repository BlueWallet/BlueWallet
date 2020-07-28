import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { DateType } from 'app/consts';

dayjs.extend(localizedFormat);

export const formatDate = (date: DateType | string, format = 'DD/MM/YY') => dayjs(date).format(format);

export const isAfter = (startDate: DateType, endDate: DateType) => dayjs(startDate).isAfter(dayjs(endDate));
