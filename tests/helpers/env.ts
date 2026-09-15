/**
 * Jest `it` / `describe` that register as skipped (and show up in the report)
 * when any of the named environment variables are unset.
 *
 * Prefer this over `if (!process.env.X) { return; }` inside a live test:
 * a bare return is recorded as a pass with zero assertions.
 *
 * `itIfEnv` and `describeIfEnv` are installed as Jest globals in tests/setup.js
 * (and tests/e2e/setup.js) so eslint-plugin-jest can alias them to `it`/`describe`.
 */
type EnvNames = string | readonly string[];

function envList(names: EnvNames): readonly string[] {
  return typeof names === 'string' ? [names] : names;
}

function envIsSet(names: EnvNames): boolean {
  return envList(names).every(name => Boolean(process.env[name]));
}

function envSkipReason(names: EnvNames): string {
  const missing = envList(names).filter(name => !process.env[name]);
  return `${missing.join(', ')} not set`;
}

function annotateName(name: unknown, reason: string): unknown {
  return typeof name === 'string' ? `${name} (${reason})` : name;
}

function annotateSkip<T extends typeof it | typeof describe>(skipFn: T, reason: string): T {
  const wrapped = ((name: unknown, ...rest: unknown[]) => {
    return (skipFn as (...args: unknown[]) => unknown)(annotateName(name, reason), ...rest);
  }) as T;
  Object.assign(wrapped, skipFn);
  const each = (skipFn as typeof it).each;
  if (typeof each === 'function') {
    (wrapped as typeof it).each = ((...table: unknown[]) => {
      const eachFn = each.apply(skipFn, table as [unknown]);
      return (name: unknown, ...rest: unknown[]) => eachFn(annotateName(name, reason), ...rest);
    }) as typeof it.each;
  }
  return wrapped;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`process.env.${name} is not set`);
  }
  return value;
}

export function itIfEnv(names: EnvNames): typeof it {
  return envIsSet(names) ? it : annotateSkip(it.skip, envSkipReason(names));
}

export function describeIfEnv(names: EnvNames): typeof describe {
  return envIsSet(names) ? describe : annotateSkip(describe.skip, envSkipReason(names));
}
