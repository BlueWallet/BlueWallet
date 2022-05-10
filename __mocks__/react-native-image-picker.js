import {NativeModules} from 'react-native';

// Mock the ImagePickerManager native module to allow us to unit test the JavaScript code
NativeModules.ImagePickerManager = {
  showImagePicker: jest.fn(),
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
};

// Reset the mocks before each test
global.beforeEach(() => {
  jest.resetAllMocks();
});
