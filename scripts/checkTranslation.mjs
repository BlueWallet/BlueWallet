import fs from 'fs';
import _ from 'lodash';
import path from 'path';

import en from '../loc/en';
import es from '../loc/es';
import id from '../loc/id_ID';
import jo from '../loc/jp_JP';
import ko from '../loc/ko_KR';
import pt from '../loc/pt_PT';
import tr from '../loc/tr_TR';
import vi from '../loc/vi_VN';
import zh from '../loc/zh_cn';

const REAL_PATH = fs.realpathSync(process.cwd());
const RESULT_PATH = path.resolve(REAL_PATH, 'scripts/missing-translations');

const customizer = (objValue, srcValue) => {
  if (typeof srcValue === 'string') {
    if (!objValue) {
      return `TRANSLATION NEEDED | ENG: ${srcValue}`;
    }
    return objValue;
  }
};

const createNewTranslationFileContent = (dict, language) => {
  let fileContent;

  fileContent += JSON.stringify(dict, null, 2) + '\n';
  fileContent = fileContent
    .replace(/"([^(")"]+)":/g, '$1:')
    .replace(/"(.+)"/g, "'$1'")
    .replace(/'\n/g, "',\n")
    .replace(/}\n/g, '},\n')
    .replace('undefined', `const ${language} = `);

  return fileContent.substr(0, fileContent.length - 2) + '\n';
};

const writeToNewTranslationFile = (file, name) => {
  if (!fs.existsSync(RESULT_PATH)) {
    fs.mkdirSync(RESULT_PATH);
  }
  const dict = _.mergeWith(file, en, customizer);
  fs.writeFile(`${RESULT_PATH}/${name}_to-improve.js`, createNewTranslationFileContent(dict, name), err => {
    if (err) throw err;

    console.log(`${name} was written`);
  });
};

writeToNewTranslationFile(es, 'es');
writeToNewTranslationFile(id, 'id');
writeToNewTranslationFile(jo, 'jo');
writeToNewTranslationFile(ko, 'ko');
writeToNewTranslationFile(pt, 'pt');
writeToNewTranslationFile(tr, 'tr');
writeToNewTranslationFile(vi, 'vi');
writeToNewTranslationFile(zh, 'zh');
