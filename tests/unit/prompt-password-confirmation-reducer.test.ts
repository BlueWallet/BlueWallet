import { ACTIONS, initialState, reducer } from '../../screen/PromptPasswordConfirmationSheet.reducer';
import { MODAL_TYPES } from '../../screen/PromptPasswordConfirmationSheet.types';

describe('PromptPasswordConfirmationSheet reducer', () => {
  describe('initialState', () => {
    it('shows explanation only for CREATE_PASSWORD', () => {
      expect(initialState(MODAL_TYPES.CREATE_PASSWORD).showExplanation).toBe(true);
      expect(initialState(MODAL_TYPES.ENTER_PASSWORD).showExplanation).toBe(false);
      expect(initialState(MODAL_TYPES.CREATE_FAKE_STORAGE).showExplanation).toBe(false);
    });

    it('starts with empty fields and not loading', () => {
      const state = initialState(MODAL_TYPES.ENTER_PASSWORD);
      expect(state.password).toBe('');
      expect(state.confirmPassword).toBe('');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('reducer', () => {
    const base = initialState(MODAL_TYPES.CREATE_PASSWORD);

    it('handles SET_PASSWORD', () => {
      const next = reducer(base, { type: ACTIONS.SET_PASSWORD, payload: 'hunter2' });
      expect(next.password).toBe('hunter2');
      expect(next.confirmPassword).toBe('');
    });

    it('handles SET_CONFIRM_PASSWORD', () => {
      const next = reducer(base, { type: ACTIONS.SET_CONFIRM_PASSWORD, payload: 'hunter2' });
      expect(next.confirmPassword).toBe('hunter2');
      expect(next.password).toBe('');
    });

    it('handles SET_LOADING', () => {
      const next = reducer(base, { type: ACTIONS.SET_LOADING, payload: true });
      expect(next.isLoading).toBe(true);
      expect(reducer(next, { type: ACTIONS.SET_LOADING, payload: false }).isLoading).toBe(false);
    });

    it('handles HIDE_EXPLANATION', () => {
      expect(base.showExplanation).toBe(true);
      const next = reducer(base, { type: ACTIONS.HIDE_EXPLANATION });
      expect(next.showExplanation).toBe(false);
    });

    it('handles RESET back to initialState for the given modalType', () => {
      const dirty = reducer(base, { type: ACTIONS.SET_PASSWORD, payload: 'abc' });
      const reset = reducer(dirty, { type: ACTIONS.RESET, payload: MODAL_TYPES.ENTER_PASSWORD });
      expect(reset).toEqual(initialState(MODAL_TYPES.ENTER_PASSWORD));
    });

    it('returns same state for unknown action', () => {
      // @ts-expect-error exercising the default branch with an unknown action type
      expect(reducer(base, { type: 'NOPE' })).toBe(base);
    });

    it('does not mutate the previous state', () => {
      const snapshot = { ...base };
      reducer(base, { type: ACTIONS.SET_PASSWORD, payload: 'x' });
      expect(base).toEqual(snapshot);
    });
  });

  describe('ACTIONS', () => {
    it('exposes named action type constants', () => {
      expect(ACTIONS).toEqual({
        SET_PASSWORD: 'SET_PASSWORD',
        SET_CONFIRM_PASSWORD: 'SET_CONFIRM_PASSWORD',
        SET_LOADING: 'SET_LOADING',
        HIDE_EXPLANATION: 'HIDE_EXPLANATION',
        RESET: 'RESET',
      });
    });
  });
});
