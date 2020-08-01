/* global it, describe */
const assert = require('assert');
const notifications = require('../../blue_modules/notifications');

describe('notifications', () => {
  it('can check groundcontrol server uri validity', async () => {
    assert.ok(await notifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com'));
    assert.ok(!(await notifications.isGroundControlUriValid('https://www.google.com')));
    assert.ok(!(await notifications.isGroundControlUriValid('https://localhost.com')));
  });
});
