import type { StateCreator } from 'zustand';
import type {
  Material,
  SearchFilters,
  CSVRow,
  MaterialType,
  ScanStatus,
  RowValidationResult,
  ImportResult,
} from '../../types';
import { searchMaterials, generateId } from '../../utils/search';
import { validateMaterialData, exportToCSV as exportToCSVUtil } from '../../utils/csv';
import type { StoreState, BatchUpdateData } from '../types';

export type MaterialSlice = {
  materials: Material[];

  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  searchMaterials: (filters: SearchFilters) => Material[];

  importFromCSV: (data: CSVRow[]) => { success: number; failed: number; errors: string[] };
  importFromPreflight: (validRows: RowValidationResult[], stats?: { skippedByUser: number; skippedByError: number }) => ImportResult;
  exportToCSV: (materialIds?: string[]) => string;

  getWorks: () => string[];
  getStats: () => {
    totalMaterials: number;
    byType: Record<MaterialType, number>;
    totalWorks: number;
    totalCharacters: number;
    totalStaff: number;
    scannedStatus: Record<ScanStatus, number>;
  };

  batchUpdateMaterials: (ids: string[], updates: BatchUpdateData) => void;
};

export const createMaterialSlice: StateCreator<
  StoreState,
  [],
  [],
  MaterialSlice
> = (set, get) => ({
  materials: [],

  addMaterial: (material) => {
    const now = new Date().toISOString();
    const newMaterial: Material = {
      pageStart: 1,
      pageEnd: material.pageCount || 0,
      ...material,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      materials: [newMaterial, ...state.materials],
    }));
  },

  updateMaterial: (id, updates) => {
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    }));
  },

  deleteMaterial: (id) => {
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
  },

  getMaterial: (id) => {
    return get().materials.find((m) => m.id === id);
  },

  searchMaterials: (filters) => {
    return searchMaterials(get().materials, filters, get().staff);
  },

  importFromCSV: (data) => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const newMaterials: Material[] = [];
    const now = new Date().toISOString();

    data.forEach((row, index) => {
      const result = validateMaterialData(row, index);
      if (!result.valid || !result.material) {
        failed++;
        errors.push(...result.errors);
        return;
      }

      const characterIds: string[] = [];
      result.material.characterIds.forEach((charName) => {
        const char = get().getOrCreateCharacter(charName, result.material!.work);
        characterIds.push(char.id);
      });

      const staffIds: string[] = [];
      result.material.staffIds.forEach((staffName) => {
        const s = get().getOrCreateStaff(staffName, '其他');
        staffIds.push(s.id);
      });

      newMaterials.push({
        ...result.material,
        id: generateId(),
        characterIds,
        staffIds,
        createdAt: now,
        updatedAt: now,
      });
      success++;
    });

    set((state) => ({
      materials: [...newMaterials, ...state.materials],
    }));

    return { success, failed, errors };
  },

  importFromPreflight: (validRows, stats) => {
    let success = 0;
    let skipped = 0;
    const newMaterials: Material[] = [];
    const now = new Date().toISOString();

    validRows.forEach((row) => {
      if (!row.material) {
        skipped++;
        return;
      }

      const characterIds: string[] = [];
      row.characterNames.forEach((charName) => {
        const char = get().getOrCreateCharacter(charName, row.material!.work);
        characterIds.push(char.id);
      });

      const staffIds: string[] = [];
      row.staffNames.forEach((staffName) => {
        const s = get().getOrCreateStaff(staffName, '其他');
        staffIds.push(s.id);
      });

      newMaterials.push({
        ...row.material,
        id: generateId(),
        characterIds,
        staffIds,
        createdAt: now,
        updatedAt: now,
      });
      success++;
    });

    set((state) => ({
      materials: [...newMaterials, ...state.materials],
    }));

    return {
      success,
      skippedByUser: stats?.skippedByUser ?? skipped,
      skippedByError: stats?.skippedByError ?? 0,
    };
  },

  exportToCSV: (materialIds) => {
    const { materials, characters, staff } = get();
    const exportMaterials = materialIds
      ? materials.filter((m) => materialIds.includes(m.id))
      : materials;

    return exportToCSVUtil(exportMaterials, characters, staff);
  },

  getWorks: () => {
    const works = new Set(get().materials.map((m) => m.work));
    return Array.from(works).filter(Boolean).sort();
  },

  getStats: () => {
    const { materials, characters, staff } = get();

    const byType: Record<MaterialType, number> = {
      artbook: 0,
      storyboard: 0,
      setting: 0,
      magazine: 0,
      special: 0,
    };

    const scannedStatus: Record<ScanStatus, number> = {
      unscanned: 0,
      partial: 0,
      completed: 0,
    };

    materials.forEach((m) => {
      byType[m.type]++;
      scannedStatus[m.scanStatus]++;
    });

    const works = new Set(materials.map((m) => m.work).filter(Boolean));

    return {
      totalMaterials: materials.length,
      byType,
      totalWorks: works.size,
      totalCharacters: characters.length,
      totalStaff: staff.length,
      scannedStatus,
    };
  },

  batchUpdateMaterials: (ids, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const newScanTasks = { ...state.scanTasks };
      if (updates.scanStatus === 'completed') {
        ids.forEach((id) => {
          delete newScanTasks[id];
        });
      }
      return {
        materials: state.materials.map((m) => {
          if (!ids.includes(m.id)) return m;
          const updated = { ...m, updatedAt: now };
          if (updates.scanStatus !== undefined) updated.scanStatus = updates.scanStatus;
          if (updates.work !== undefined) updated.work = updates.work;
          if (updates.type !== undefined) updated.type = updates.type;
          if (updates.purchaseSource !== undefined) updated.purchaseSource = updates.purchaseSource;
          if (updates.appendCharacterIds && updates.appendCharacterIds.length > 0) {
            const existing = new Set(updated.characterIds);
            updates.appendCharacterIds.forEach((id) => existing.add(id));
            updated.characterIds = Array.from(existing);
          }
          if (updates.appendStaffIds && updates.appendStaffIds.length > 0) {
            const existing = new Set(updated.staffIds);
            updates.appendStaffIds.forEach((id) => existing.add(id));
            updated.staffIds = Array.from(existing);
          }
          return updated;
        }),
        scanTasks: newScanTasks,
      };
    });
  },
});
