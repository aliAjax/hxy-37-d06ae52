import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Material, Character, Staff, SearchFilters, CSVRow, MaterialType, ScanStatus, ScanTask, WishItem, WishPriority } from '../types';
import { sampleMaterials, sampleCharacters, sampleStaff } from '../data/sampleData';
import { searchMaterials, generateId } from '../utils/search';
import { validateMaterialData, exportToCSV as exportToCSVUtil } from '../utils/csv';

export interface BatchUpdateData {
  scanStatus?: ScanStatus;
  work?: string;
  type?: MaterialType;
  purchaseSource?: string;
  appendCharacterIds?: string[];
  appendStaffIds?: string[];
}

interface StoreState {
  materials: Material[];
  characters: Character[];
  staff: Staff[];
  scanTasks: Record<string, ScanTask>;
  wishItems: WishItem[];
  initialized: boolean;

  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  searchMaterials: (filters: SearchFilters) => Material[];

  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getOrCreateCharacter: (name: string, work: string) => Character;

  addStaff: (staff: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  getOrCreateStaff: (name: string, role: string) => Staff;

  importFromCSV: (data: CSVRow[]) => { success: number; failed: number; errors: string[] };
  exportToCSV: (materialIds?: string[]) => string;

  initializeWithSampleData: () => void;
  clearAllData: () => void;

  getWorks: () => string[];
  getStats: () => {
    totalMaterials: number;
    byType: Record<MaterialType, number>;
    totalWorks: number;
    totalCharacters: number;
    totalStaff: number;
    scannedStatus: Record<ScanStatus, number>;
  };

  setScanTask: (materialId: string, task: Omit<ScanTask, 'materialId' | 'createdAt' | 'updatedAt'>) => void;
  getScanTask: (materialId: string) => ScanTask | undefined;
  deleteScanTask: (materialId: string) => void;
  getAllScanTasks: () => ScanTask[];

  addWishItem: (item: Omit<WishItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWishItem: (id: string, updates: Partial<WishItem>) => void;
  deleteWishItem: (id: string) => void;
  getWishItem: (id: string) => WishItem | undefined;
  convertWishToMaterial: (wishId: string) => void;
  getWishStats: () => {
    total: number;
    byPriority: Record<WishPriority, number>;
    totalEstimatedPrice: number;
  };

  batchUpdateMaterials: (ids: string[], updates: BatchUpdateData) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      materials: [],
      characters: [],
      staff: [],
      scanTasks: {},
      wishItems: [],
      initialized: false,

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

      addCharacter: (character) => {
        const newCharacter: Character = {
          ...character,
          id: generateId(),
        };
        set((state) => ({
          characters: [...state.characters, newCharacter],
        }));
        return newCharacter;
      },

      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCharacter: (id) => {
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          materials: state.materials.map((m) => ({
            ...m,
            characterIds: m.characterIds.filter((cid) => cid !== id),
          })),
        }));
      },

      getOrCreateCharacter: (name, work) => {
        const existing = get().characters.find(
          (c) => c.name === name && c.work === work
        );
        if (existing) return existing;

        const newCharacter: Character = {
          id: generateId(),
          name,
          work,
        };
        set((state) => ({
          characters: [...state.characters, newCharacter],
        }));
        return newCharacter;
      },

      addStaff: (staffMember) => {
        const newStaff: Staff = {
          ...staffMember,
          id: generateId(),
        };
        set((state) => ({
          staff: [...state.staff, newStaff],
        }));
        return newStaff;
      },

      updateStaff: (id, updates) => {
        set((state) => ({
          staff: state.staff.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteStaff: (id) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
          materials: state.materials.map((m) => ({
            ...m,
            staffIds: m.staffIds.filter((sid) => sid !== id),
          })),
        }));
      },

      getOrCreateStaff: (name, role) => {
        const existing = get().staff.find(
          (s) => s.name === name && s.role === role
        );
        if (existing) return existing;

        const newStaff: Staff = {
          id: generateId(),
          name,
          role,
          works: [],
        };
        set((state) => ({
          staff: [...state.staff, newStaff],
        }));
        return newStaff;
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

      exportToCSV: (materialIds) => {
        const { materials, characters, staff } = get();
        const exportMaterials = materialIds
          ? materials.filter((m) => materialIds.includes(m.id))
          : materials;

        return exportToCSVUtil(exportMaterials, characters, staff);
      },

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
        });
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

      setScanTask: (materialId, task) => {
        const now = new Date().toISOString();
        const existing = get().scanTasks[materialId];
        set((state) => ({
          scanTasks: {
            ...state.scanTasks,
            [materialId]: {
              ...task,
              materialId,
              createdAt: existing?.createdAt || now,
              updatedAt: now,
            },
          },
        }));
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

      addWishItem: (item) => {
        const now = new Date().toISOString();
        const newWishItem: WishItem = {
          ...item,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          wishItems: [newWishItem, ...state.wishItems],
        }));
      },

      updateWishItem: (id, updates) => {
        set((state) => ({
          wishItems: state.wishItems.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
        }));
      },

      deleteWishItem: (id) => {
        set((state) => ({
          wishItems: state.wishItems.filter((w) => w.id !== id),
        }));
      },

      getWishItem: (id) => {
        return get().wishItems.find((w) => w.id === id);
      },

      convertWishToMaterial: (wishId) => {
        const wish = get().wishItems.find((w) => w.id === wishId);
        if (!wish) return;

        const now = new Date().toISOString();
        const newMaterial: Material = {
          id: generateId(),
          title: wish.title,
          type: wish.type,
          work: wish.work,
          publisher: '',
          publishDate: '',
          pageCount: 0,
          pageStart: 1,
          pageEnd: 0,
          purchaseSource: wish.purchaseChannel,
          scanStatus: 'unscanned',
          copyrightNote: '',
          description: wish.notes,
          characterIds: [],
          staffIds: [],
          pageReferences: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          materials: [newMaterial, ...state.materials],
          wishItems: state.wishItems.filter((w) => w.id !== wishId),
        }));
      },

      getWishStats: () => {
        const { wishItems } = get();
        const byPriority: Record<WishPriority, number> = {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
        };
        let totalEstimatedPrice = 0;

        wishItems.forEach((w) => {
          byPriority[w.priority]++;
          totalEstimatedPrice += w.estimatedPrice || 0;
        });

        return {
          total: wishItems.length,
          byPriority,
          totalEstimatedPrice,
        };
      },

      batchUpdateMaterials: (ids, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
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
        }));
      },
    }),
    {
      name: 'animation-material-collection',
    }
  )
);
