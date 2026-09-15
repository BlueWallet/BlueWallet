import { RuleTester } from 'eslint';

import rule from '../../scripts/eslint-plugin-bluewallet/no-silent-test-skip';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

const error = (kind, helper) => ({
  message: `Returning from ${kind}() when an environment variable is missing is recorded as a pass. Use ${helper} from tests/helpers/env so the test is reported as skipped.`,
});

ruleTester.run('no-silent-test-skip', rule, {
  valid: [
    "it('works', () => { assert.ok(true); });",
    "itIfEnv('HD_MNEMONIC')('works', () => { hd.setSecret(process.env.HD_MNEMONIC); });",
    "describeIfEnv('HD_MNEMONIC')('suite', () => { it('works', () => {}); });",
    "it('works', () => { if (process.env.CI) { console.warn('ci'); } });",
    "it('works', () => { if (process.env.CI) { if (existsSync(lock)) return console.warn('skip'); } });",
    "it('works', () => { if (!(rate > 0)) { return; } });",
    "describe('suite', () => { beforeAll(() => { if (!process.env.HD_MNEMONIC) return; }); it('works', () => {}); });",
    "it.skip('slow', () => { const x = process.env.CI; assert.ok(x); });",
    'function helper() { if (!process.env.FOO) return; }',
  ],
  invalid: [
    {
      code: "it('works', () => { if (!process.env.HD_MNEMONIC) { console.error('skipped'); return; } });",
      errors: [error('it', 'itIfEnv')],
    },
    {
      code: "it('works', async () => { if (!process.env.A || !process.env.B) return; });",
      errors: [error('it', 'itIfEnv')],
    },
    {
      code: "test('works', () => { if (!process.env.FOO) return; });",
      errors: [error('it', 'itIfEnv')],
    },
    {
      code: "it.each([1])('works %p', () => { if (!process.env.FOO) return; });",
      errors: [error('it', 'itIfEnv')],
    },
    {
      code: "describe('suite', () => { if (!process.env.FOO) { return; } it('works', () => {}); });",
      errors: [error('describe', 'describeIfEnv')],
    },
    {
      code: "it.skip('slow', () => { if (!(process.env.CI || process.env.TRAVIS)) return; });",
      errors: [error('it', 'itIfEnv')],
    },
    {
      code: "itIfEnv('FOO')('works', () => { if (!process.env.FOO) return; });",
      errors: [error('it', 'itIfEnv')],
    },
  ],
});
