/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back. If QRCode scan was closed, promise resolves to null.
 *
 * @param navigateFunc {function}
 * @param currentScreenName {string}
 * @param showFileImportButton {boolean}
 *
 * @return {Promise<string>}
 */
module.exports = function scanQrHelper(navigateFunc, currentScreenName, showFileImportButton = true) {
  return new Promise(resolve => {
    const params = {};
    params.showFileImportButton = !!showFileImportButton;

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
