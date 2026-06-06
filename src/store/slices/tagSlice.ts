import type { StateCreator } from 'zustand';
import type { Character, Staff } from '../../types';
import { generateId } from '../../utils/search';
import type { StoreState } from '../types';

export type TagSlice = {
  characters: Character[];
  staff: Staff[];

  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getOrCreateCharacter: (name: string, work: string) => Character;

  addStaff: (staff: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  getOrCreateStaff: (name: string, role: string) => Staff;
};

export const createTagSlice: StateCreator<
  StoreState,
  [],
  [],
  TagSlice
> = (set, get) => ({
  characters: [],
  staff: [],

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
});
