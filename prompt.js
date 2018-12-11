import prompt from 'react-native-prompt-android';

module.exports = (title, text, isCancelable = true) => {
  return new Promise((resolve, reject) => {
    const buttons = isCancelable
      ? [
          {
            text: 'Cancel',
            onPress: () => {
              reject(Error('Cancel Pressed'));
            },
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: password => {
              console.log('OK Pressed, password: ' + password);
              resolve(password);
            },
          },
        ]
      : [
          {
            text: 'OK',
            onPress: password => {
              console.log('OK Pressed, password: ' + password);
              resolve(password);
            },
          },
        ];

    prompt(title, text, buttons, {
      type: 'secure-text',
      cancelable: isCancelable,
    });
  });
};
