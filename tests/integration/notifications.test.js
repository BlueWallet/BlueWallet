import assert from 'assert';

import Notifications from '../../blue_modules/notifications';
// Notifications.default = new Notifications();

describe('notifications', () => {
  // yeah, lets rely less on external services...
  it.skip('can check groundcontrol server uri validity', async () => {
    assert.ok(await Notifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await Notifications.isGroundControlUriValid('https://www.google.com')));
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // muted because it causes jest to hang waiting indefinitely
  it.skip('can check non-responding url', async () => {
    assert.ok(!(await Notifications.isGroundControlUriValid('https://localhost.com')));
  });
});
