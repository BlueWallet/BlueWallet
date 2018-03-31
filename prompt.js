import { AlertIOS } from 'react-native';

module.exports = function(title, text) {
  return new Promise(function(resolve, reject) {
    AlertIOS.prompt(
      title,
      text,
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('Cancel Pressed');
            reject(new Error('Cancel Pressed'));
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
      ],
      'secure-text',
    );
  });
};
