import type {
  Material,
  Character,
  Staff,
  ScanTask,
  WishItem,
  WorkInfo,
  SearchFilters,
  CSVRow,
  MaterialType,
  ScanStatus,
  RowValidationResult,
  ImportResult,
  WishPriority,
  WishItem as WishItemType,
} from '../types';
import type { DuplicateCheckRules } from '../utils/duplicateCheck';

export interface BatchUpdateData {
  scanStatus?: ScanStatus;
  work?: string;
  type?: MaterialType;
  purchaseSource?: string;
  appendCharacterIds?: string[];
  appendStaffIds?: string[];
}

export interface StoreState {
  materials: Material[];
  characters: Character[];
  staff: Staff[];
  scanTasks: Record<string, ScanTask>;
  wishItems: WishItem[];
  workInfos: Record<string, WorkInfo>;
  initialized: boolean;
  duplicateRules: DuplicateCheckRules;

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
  importFromPreflight: (validRows: RowValidationResult[], stats?: { skippedByUser: number; skippedByError: number }) => ImportResult;
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
  batchSetScanTasks: (materialIds: string[], task: Omit<ScanTask, 'materialId' | 'createdAt' | 'updatedAt'>) => { created: number; updated: number; };
  completeMaterialScan: (materialId: string) => void;

  addWishItem: (item: Omit<WishItemType, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWishItem: (id: string, updates: Partial<WishItemType>) => void;
  deleteWishItem: (id: string) => void;
  getWishItem: (id: string) => WishItemType | undefined;
  convertWishToMaterial: (wishId: string, additionalData?: Partial<Material>) => void;
  getWishStats: () => {
    total: number;
    byPriority: Record<WishPriority, number>;
    totalEstimatedPrice: number;
  };

  batchUpdateMaterials: (ids: string[], updates: BatchUpdateData) => void;

  getWorkInfo: (workName: string) => WorkInfo | undefined;
  setWorkFavorite: (workName: string, isFavorite: boolean) => void;
  setWorkNotes: (workName: string, notes: string) => void;
  updateWorkInfo: (workName: string, updates: Partial<WorkInfo>) => void;

  updateDuplicateRules: (updates: {
    weights?: Partial<DuplicateCheckRules['weights']>;
    thresholds?: Partial<DuplicateCheckRules['thresholds']>;
  }) => void;
  resetDuplicateRules: () => void;
}
