import type { StateCreator } from 'zustand';
import type { WishItem, WishPriority, Material } from '../../types';
import { generateId } from '../../utils/search';
import type { StoreState } from '../types';

export type WishListSlice = {
  wishItems: WishItem[];

  addWishItem: (item: Omit<WishItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWishItem: (id: string, updates: Partial<WishItem>) => void;
  deleteWishItem: (id: string) => void;
  getWishItem: (id: string) => WishItem | undefined;
  convertWishToMaterial: (wishId: string, additionalData?: Partial<Material>) => void;
  getWishStats: () => {
    total: number;
    byPriority: Record<WishPriority, number>;
    totalEstimatedPrice: number;
  };
};

export const createWishListSlice: StateCreator<
  StoreState,
  [],
  [],
  WishListSlice
> = (set, get) => ({
  wishItems: [],

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

  convertWishToMaterial: (wishId, additionalData = {}) => {
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
      ...additionalData,
      createdAt: now,
      updatedAt: now,
    };

    if (newMaterial.pageCount && !additionalData.pageEnd) {
      newMaterial.pageEnd = newMaterial.pageCount;
    }

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
});
