import Notifications from '../../blue_modules/notifications';
const assert = require('assert');
Notifications.default = new Notifications();
describe('notifications', () => {
  it('can check groundcontrol server uri validity', async () => {
    assert.ok(await Notifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await Notifications.isGroundControlUriValid('https://www.google.com')));
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // muted because it causes jest to hang waiting indefinitely
  it.skip('can check non-responding url', async () => {
    assert.ok(!(await Notifications.isGroundControlUriValid('https://localhost.com')));
  });
});
