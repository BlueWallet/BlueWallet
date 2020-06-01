// import { CommonActions } from '@react-navigation/native';

let _navigator;

function setTopLevelNavigator(navigatorRef) {
  _navigator = navigatorRef;
}

function navigate(name, params) {
  _navigator.navigate(name, params);
}

export default {
  navigate,
  setTopLevelNavigator,
};
