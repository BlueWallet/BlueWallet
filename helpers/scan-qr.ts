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
module.exports = function scanQrHelper(
  navigateFunc: (scr: string, params?: any) => void,
  currentScreenName: string,
  showFileImportButton = true,
): Promise<string | null> {
  return new Promise(resolve => {
    const params = {
      showFileImportButton: Boolean(showFileImportButton),
      onBarScanned: (data: any) => {},
      onDismiss: () => {},
    };

    params.onBarScanned = function (data: any) {
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

export {};
