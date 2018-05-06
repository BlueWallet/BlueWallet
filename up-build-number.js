let fs = require('fs');
var appjson = require('./app.json');
appjson.expo.ios.buildNumber++;
fs.writeFileSync('./app.json', JSON.stringify(appjson, null, 2));
