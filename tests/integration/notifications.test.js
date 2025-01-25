import assert from 'assert';
import { isGroundControlUriValid } from '../../blue_modules/notifications';

// Notifications.default = new Notifications();

describe('notifications', () => {
  // yeah, lets rely less on external services...
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can check groundcontrol server uri validity', async () => {
    assert.ok(await isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await isGroundControlUriValid('https://www.google.com')));
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // muted because it causes jest to hang waiting indefinitely
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can check non-responding url', async () => {
    assert.ok(!(await isGroundControlUriValid('https://localhost.com')));
  });
});
