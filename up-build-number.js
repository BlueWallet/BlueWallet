const fs = require('fs');

const appjson = require('./app.json');

appjson.expo.ios.buildNumber++;
appjson.expo.ios.buildNumber = appjson.expo.ios.buildNumber + ''; // casting to string
console.log(appjson.expo.version, '(', appjson.expo.ios.buildNumber, ')');
fs.writeFileSync('./app.json', JSON.stringify(appjson, null, 2));
