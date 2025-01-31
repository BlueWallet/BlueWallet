import { Platform } from 'react-native';
import iosHandoffListener from './useHandoffListener.ios';

const useHandoffListener = Platform.OS === 'ios' ? iosHandoffListener : () => {};

export default useHandoffListener;
