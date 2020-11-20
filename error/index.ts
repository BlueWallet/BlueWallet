import * as Sentry from '@sentry/react-native';

export { default as messages } from './messages';

export const captureException = (error: string) => Sentry.captureException(error);
