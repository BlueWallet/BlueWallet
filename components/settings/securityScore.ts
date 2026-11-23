/**
 * How many of the app's protections are on, for the settings list and the
 * security screen. Biometrics only counts on a device that has them.
 */
export interface SecurityState {
  biometricsAvailable: boolean;
  biometricsOn: boolean;
  /** Storage encrypted with a password. */
  encrypted: boolean;
  /** Screenshots blocked on the sensitive screens (the default after a restart). */
  screenshotsBlocked: boolean;
}

export interface SecurityScore {
  on: number;
  total: number;
  full: boolean;
}

export function securityScore(state: SecurityState): SecurityScore {
  const checks = [state.encrypted, state.screenshotsBlocked];
  if (state.biometricsAvailable) checks.unshift(state.biometricsOn);
  const on = checks.filter(Boolean).length;
  return { on, total: checks.length, full: on === checks.length };
}
