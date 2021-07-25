import Notifications from '../../blue_modules/notifications';

Notifications.default = new Notifications();

describe('notifications', () => {
  it('can check groundcontrol server uri validity', async () => {
    expect(await Notifications.isGroundControlUriValid('https://groundcontrol-bluewallet.herokuapp.com')).toBeTruthy();
    expect(!(await Notifications.isGroundControlUriValid('https://www.google.com'))).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // muted because it causes jest to hang waiting indefinitely
  it.skip('can check non-responding url', async () => {
    expect(!(await Notifications.isGroundControlUriValid('https://localhost.com'))).toBeTruthy();
  });
});
