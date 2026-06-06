import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_VERSION, STORAGE_NAME, createMigrate } from '../utils/storeMigrate';
import type { StoreState, BatchUpdateData } from './types';
import { createMaterialSlice } from './slices/materialSlice';
import { createTagSlice } from './slices/tagSlice';
import { createScanTaskSlice } from './slices/scanTaskSlice';
import { createWishListSlice } from './slices/wishListSlice';
import { createWorkInfoSlice } from './slices/workInfoSlice';
import { createDuplicateRuleSlice } from './slices/duplicateRuleSlice';
import { createAppSlice } from './slices/appSlice';

export type { StoreState, BatchUpdateData };

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createMaterialSlice(...args),
      ...createTagSlice(...args),
      ...createScanTaskSlice(...args),
      ...createWishListSlice(...args),
      ...createWorkInfoSlice(...args),
      ...createDuplicateRuleSlice(...args),
      ...createAppSlice(...args),
    }),
    {
      name: STORAGE_NAME,
      version: STORAGE_VERSION,
      migrate: createMigrate(),
    }
  )
);
