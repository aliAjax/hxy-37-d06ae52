import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Material, Character, Staff, SearchFilters, CSVRow, MaterialType, ScanStatus } from '../types';
import { sampleMaterials, sampleCharacters, sampleStaff } from '../data/sampleData';
import { searchMaterials, generateId } from '../utils/search';
import { validateMaterialData, exportToCSV as exportToCSVUtil } from '../utils/csv';

interface StoreState {
  materials: Material[];
  characters: Character[];
  staff: Staff[];
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
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      materials: [],
      characters: [],
      staff: [],
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
    }),
    {
      name: 'animation-material-collection',
    }
  )
);
