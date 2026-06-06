import type { StateCreator } from 'zustand';
import type { ScanTask } from '../../types';
import type { StoreState } from '../types';

export type ScanTaskSlice = {
  scanTasks: Record<string, ScanTask>;

  setScanTask: (materialId: string, task: Omit<ScanTask, 'materialId' | 'createdAt' | 'updatedAt'>) => void;
  getScanTask: (materialId: string) => ScanTask | undefined;
  deleteScanTask: (materialId: string) => void;
  getAllScanTasks: () => ScanTask[];
  batchSetScanTasks: (materialIds: string[], task: Omit<ScanTask, 'materialId' | 'createdAt' | 'updatedAt'>) => { created: number; updated: number; };
  completeMaterialScan: (materialId: string) => void;
};

export const createScanTaskSlice: StateCreator<
  StoreState,
  [],
  [],
  ScanTaskSlice
> = (set, get) => ({
  scanTasks: {},

  setScanTask: (materialId, task) => {
    const now = new Date().toISOString();
    set((state) => {
      const existing = state.scanTasks[materialId];
      return {
        scanTasks: {
          ...state.scanTasks,
          [materialId]: {
            ...task,
            materialId,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          },
        },
      };
    });
  },

  getScanTask: (materialId) => {
    return get().scanTasks[materialId];
  },

  deleteScanTask: (materialId) => {
    set((state) => {
      const newTasks = { ...state.scanTasks };
      delete newTasks[materialId];
      return { scanTasks: newTasks };
    });
  },

  getAllScanTasks: () => {
    return Object.values(get().scanTasks);
  },

  batchSetScanTasks: (materialIds, task) => {
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    set((state) => {
      const newScanTasks = { ...state.scanTasks };
      materialIds.forEach((id) => {
        const existing = newScanTasks[id];
        if (existing) {
          updated++;
        } else {
          created++;
        }
        newScanTasks[id] = {
          ...task,
          materialId: id,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
      });
      return { scanTasks: newScanTasks };
    });
    return { created, updated };
  },

  completeMaterialScan: (materialId) => {
    set((state) => {
      const newScanTasks = { ...state.scanTasks };
      delete newScanTasks[materialId];
      return {
        materials: state.materials.map((m) =>
          m.id === materialId
            ? { ...m, scanStatus: 'completed', updatedAt: new Date().toISOString() }
            : m
        ),
        scanTasks: newScanTasks,
      };
    });
  },
});
