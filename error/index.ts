import * as Sentry from '@sentry/react-native';

import * as AppErrors from './AppErrors';

export { default as messages } from './messages';

export { AppErrors };

export const captureException = (error: string) => Sentry.captureException(error);
