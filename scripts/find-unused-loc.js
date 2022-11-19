const fs = require('fs');
const path = require('path');

const mainLocFile = './loc/en.json';
const dirsToInterate = ['components', 'screen', 'blue_modules', 'class'];
const addFiles = ['BlueComponents.js', 'App.js', 'BlueApp.js'];
const allowedLocPrefixes = ['loc.lnurl_auth', 'loc.units'];

const allLocKeysHashmap = {}; // loc key -> used or not

const getAllFiles = function (dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.resolve(path.join(dirPath, '/', file)));
    }
  });

  return arrayOfFiles;
};

const allDirFiles = [];
for (const dir of dirsToInterate) {
  allDirFiles.push(...getAllFiles(dir));
}

for (const filename of addFiles) {
  allDirFiles.push(path.resolve(filename));
}
allDirFiles.push(path.resolve('App.js'));

// got all source files

function objKeysRecursive(obj, depth = []) {
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      objKeysRecursive(obj[k], depth.concat(k));
    } else {
      allLocKeysHashmap['loc.' + depth.join('.') + '.' + k] = false; // false means unused
    }
  }
}
objKeysRecursive(JSON.parse(fs.readFileSync(mainLocFile).toString('utf8')));

// got all loc keys.
// finally, iterating all source files, readign them and looking for unused loc keys

// iterating all files
for (const filepath of allDirFiles) {
  const contents = fs.readFileSync(filepath);

  // opened a file. iterating all loc keys
  for (const key of Object.keys(allLocKeysHashmap)) {
    if (contents.includes(key)) {
      // opened file uses this loc key. marking it as used
      allLocKeysHashmap[key] = true;
    }
  }
}

// done! now printing results:

let exitCode = 0;
for (const key of Object.keys(allLocKeysHashmap)) {
  let allow = false;
  for (const allowedKey of allowedLocPrefixes) {
    if (key.startsWith(allowedKey)) allow = true;
  }

  if (allLocKeysHashmap[key] === false && !allow) {
    console.log('Unused loc key: ' + key);
    exitCode = 1;
  }
}

process.exit(exitCode);
