import * as Sentry from '@sentry/react-native';

export const createLogMsg = (level: Sentry.Severity) => (category: string, message: string) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
  });
};

export default {
  info: createLogMsg(Sentry.Severity.Info),
  error: createLogMsg(Sentry.Severity.Error),
  warn: createLogMsg(Sentry.Severity.Warning),
};
