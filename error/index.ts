import * as Sentry from '@sentry/react-native';

export const captureException = (error: string) => Sentry.captureException(error);
