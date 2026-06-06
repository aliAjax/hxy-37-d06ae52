import type { StateCreator } from 'zustand';
import type { WorkInfo } from '../../types';
import type { StoreState } from '../types';

export type WorkInfoSlice = {
  workInfos: Record<string, WorkInfo>;

  getWorkInfo: (workName: string) => WorkInfo | undefined;
  setWorkFavorite: (workName: string, isFavorite: boolean) => void;
  setWorkNotes: (workName: string, notes: string) => void;
  updateWorkInfo: (workName: string, updates: Partial<WorkInfo>) => void;
};

export const createWorkInfoSlice: StateCreator<
  StoreState,
  [],
  [],
  WorkInfoSlice
> = (set, get) => ({
  workInfos: {},

  getWorkInfo: (workName) => {
    return get().workInfos[workName];
  },

  setWorkFavorite: (workName, isFavorite) => {
    const now = new Date().toISOString();
    set((state) => {
      const existing = state.workInfos[workName];
      return {
        workInfos: {
          ...state.workInfos,
          [workName]: {
            workName,
            isFavorite,
            notes: existing?.notes || '',
            updatedAt: now,
          },
        },
      };
    });
  },

  setWorkNotes: (workName, notes) => {
    const now = new Date().toISOString();
    set((state) => {
      const existing = state.workInfos[workName];
      return {
        workInfos: {
          ...state.workInfos,
          [workName]: {
            workName,
            isFavorite: existing?.isFavorite || false,
            notes,
            updatedAt: now,
          },
        },
      };
    });
  },

  updateWorkInfo: (workName, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const existing = state.workInfos[workName];
      return {
        workInfos: {
          ...state.workInfos,
          [workName]: {
            workName,
            isFavorite: false,
            notes: '',
            ...existing,
            ...updates,
            updatedAt: now,
          },
        },
      };
    });
  },
});
