import { AlertIOS } from 'react-native';

module.exports = (title, text) => {
  return new Promise((resolve, reject) => {
    AlertIOS.prompt(
      title,
      text,
      [
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
      ],
      'secure-text',
    );
  });
};
