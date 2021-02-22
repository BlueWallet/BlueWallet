/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back. If QRCode scan was closed, promise resolves to null.
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

    params.onDismiss = function () {
      setTimeout(() => resolve(null), 1);
    };

    navigateFunc('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params,
    });
  });
};
