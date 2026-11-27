/**
 * A rough reading of a new app password, for the meter of the encryption
 * upgrade (H08). The slow key derivation makes each guess expensive, but
 * only a long password keeps a stolen copy out of reach: the meter favours
 * length, then variety. It is a hint, not a guarantee.
 */
export type PasswordStrength = 'weak' | 'fair' | 'strong';

/** A new password shorter than this is not accepted. */
export const MIN_NEW_PASSWORD_LENGTH = 8;

export function passwordStrength(password: string): PasswordStrength {
  const length = Array.from(password).length;
  if (length < MIN_NEW_PASSWORD_LENGTH || new Set(password).size < 5) return 'weak';
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(kind => kind.test(password)).length;
  if (length >= 16 || (length >= 12 && kinds >= 3)) return 'strong';
  if (length >= 12 || kinds >= 3) return 'fair';
  return 'weak';
}
