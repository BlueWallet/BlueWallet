import { ContinuityActivityType } from '../components/types';

interface UseContinuityParams {
  title?: string;
  type: ContinuityActivityType;
  url?: string;
  userInfo?: object;
}

const useContinuity = (_params: UseContinuityParams): void => {};

export default useContinuity;
