import dayjs from 'dayjs';

import { DateType } from 'app/consts';

export const formatDate = (date: DateType, format = 'DD/MM/YY') => dayjs(date).format(format);

export const isAfter = (startDate: DateType, endDate: DateType) => dayjs(startDate).isAfter(dayjs(endDate));
