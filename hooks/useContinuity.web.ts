import { ContinuityActivityType } from '../components/types';

interface UseContinuityParams {
  title?: string;
  type: ContinuityActivityType;
  url?: string;
  userInfo?: object;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useContinuity = (_params: UseContinuityParams): void => {};

export default useContinuity;
