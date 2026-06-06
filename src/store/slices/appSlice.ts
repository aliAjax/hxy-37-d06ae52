import type { StateCreator } from 'zustand';
import { sampleMaterials, sampleCharacters, sampleStaff } from '../../data/sampleData';
import type { StoreState } from '../types';

export type AppSlice = {
  initialized: boolean;

  initializeWithSampleData: () => void;
  clearAllData: () => void;
};

export const createAppSlice: StateCreator<
  StoreState,
  [],
  [],
  AppSlice
> = (set) => ({
  initialized: false,

  initializeWithSampleData: () => {
    set({
      materials: sampleMaterials,
      characters: sampleCharacters,
      staff: sampleStaff,
      initialized: true,
    });
  },

  clearAllData: () => {
    set({
      materials: [],
      characters: [],
      staff: [],
      scanTasks: {},
      wishItems: [],
      workInfos: {},
    });
  },
});
