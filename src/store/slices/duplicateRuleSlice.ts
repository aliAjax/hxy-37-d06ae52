import type { StateCreator } from 'zustand';
import { DuplicateCheckRules, DEFAULT_DUPLICATE_RULES } from '../../utils/duplicateCheck';
import type { StoreState } from '../types';

export type DuplicateRuleSlice = {
  duplicateRules: DuplicateCheckRules;

  updateDuplicateRules: (updates: {
    weights?: Partial<DuplicateCheckRules['weights']>;
    thresholds?: Partial<DuplicateCheckRules['thresholds']>;
  }) => void;
  resetDuplicateRules: () => void;
};

export const createDuplicateRuleSlice: StateCreator<
  StoreState,
  [],
  [],
  DuplicateRuleSlice
> = (set) => ({
  duplicateRules: DEFAULT_DUPLICATE_RULES,

  updateDuplicateRules: (updates) => {
    set((state) => ({
      duplicateRules: {
        weights: {
          ...state.duplicateRules.weights,
          ...updates.weights,
        },
        thresholds: {
          ...state.duplicateRules.thresholds,
          ...updates.thresholds,
        },
      },
    }));
  },

  resetDuplicateRules: () => {
    set({ duplicateRules: DEFAULT_DUPLICATE_RULES });
  },
});
