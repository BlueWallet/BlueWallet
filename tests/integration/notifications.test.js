/* global it, describe */
const assert = require('assert');
const { default: BlueNotifications } = require('../../blue_modules/notifications');

describe('notifications', () => {
  it('can check groundcontrol server uri validity', async () => {
    assert.ok(await BlueNotifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await BlueNotifications.isGroundControlUriValid('https://www.google.com')));
    assert.ok(!(await BlueNotifications.isGroundControlUriValid('https://localhost.com')));
  });
});
