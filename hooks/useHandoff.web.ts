import { HandOffActivityType } from '../components/types';

interface UseHandoffParams {
  title?: string;
  type: HandOffActivityType;
  url?: string;
  userInfo?: object;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useHandoff = (_params: UseHandoffParams): void => {};

export default useHandoff;
