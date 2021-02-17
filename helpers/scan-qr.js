/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back
 *
 * @param navigateFunc {function}
 * @param currentScreenName {string}
 *
 * @return {Promise<string>}
 */
module.exports = function (navigateFunc, currentScreenName) {
  return new Promise(resolve => {
    const params = {};
    params.showFileImportButton = true;

    params.onBarScanned = function (data) {
      setTimeout(() => resolve(data.data || data), 1);
      navigateFunc(currentScreenName);
    };

    navigateFunc('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params,
    });
  });
};
