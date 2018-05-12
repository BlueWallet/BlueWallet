let fs = require('fs');
var appjson = require('./app.json');
appjson.expo.ios.buildNumber++;
appjson.expo.ios.buildNumber = appjson.expo.ios.buildNumber + ''; // casting to string
fs.writeFileSync('./app.json', JSON.stringify(appjson, null, 2));
