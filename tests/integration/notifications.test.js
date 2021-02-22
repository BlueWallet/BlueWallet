import Notifications from '../../blue_modules/notifications';
const assert = require('assert');
Notifications.default = new Notifications();
describe('notifications', () => {
  it('can check groundcontrol server uri validity', async () => {
    assert.ok(await Notifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await Notifications.isGroundControlUriValid('https://www.google.com')));
    assert.ok(!(await Notifications.isGroundControlUriValid('https://localhost.com')));
  });
});
