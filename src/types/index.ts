export type MaterialType = 'artbook' | 'storyboard' | 'setting' | 'magazine' | 'special';
export type ScanStatus = 'unscanned' | 'partial' | 'completed';
export type ScanPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WishPriority = 'low' | 'medium' | 'high' | 'urgent';

export const MaterialTypeLabels: Record<MaterialType, string> = {
  artbook: '原画集',
  storyboard: '分镜集',
  setting: '设定集',
  magazine: '杂志切页',
  special: '特典册',
};

export const ScanStatusLabels: Record<ScanStatus, string> = {
  unscanned: '未扫描',
  partial: '部分扫描',
  completed: '已完成',
};

export const ScanPriorityLabels: Record<ScanPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export const WishPriorityLabels: Record<WishPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '必入',
};

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  work: string;
  publisher: string;
  publishDate: string;
  pageCount: number;
  pageStart: number;
  pageEnd: number;
  purchaseSource: string;
  scanStatus: ScanStatus;
  copyrightNote: string;
  description: string;
  characterIds: string[];
  staffIds: string[];
  pageReferences: PageReference[];
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  work: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  works: string[];
}

export interface PageReference {
  id: string;
  pageNumber: number;
  description: string;
  characterIds: string[];
  staffIds: string[];
}

export interface SearchFilters {
  work?: string;
  characterId?: string;
  staffId?: string;
  staffRole?: string;
  type?: MaterialType;
  yearFrom?: number;
  yearTo?: number;
  keyword?: string;
  scanStatus?: ScanStatus;
}

export interface CSVRow {
  [key: string]: string | number | undefined;
  标题?: string;
  类型?: string;
  作品?: string;
  出版社?: string;
  出版日期?: string;
  总页数?: number | string;
  起始页码?: number | string;
  结束页码?: number | string;
  购买来源?: string;
  扫描状态?: string;
  版权备注?: string;
  收录内容?: string;
  关联角色?: string;
  关联制作人员?: string;
}

export interface AppState {
  materials: Material[];
  characters: Character[];
  staff: Staff[];

  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  searchMaterials: (filters: SearchFilters) => Material[];

  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  addStaff: (staff: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  importFromCSV: (data: CSVRow[]) => { success: number; failed: number; errors: string[] };
  exportToCSV: (materialIds?: string[]) => string;

  loadFromStorage: () => void;
  saveToStorage: () => void;

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

export interface ScanTask {
  materialId: string;
  priority: ScanPriority;
  plannedDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanTaskFilters {
  scanStatus?: ScanStatus;
  work?: string;
  type?: MaterialType;
  priority?: ScanPriority;
}

export interface WishItem {
  id: string;
  title: string;
  work: string;
  type: MaterialType;
  estimatedPrice: number;
  purchaseChannel: string;
  priority: WishPriority;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishFilters {
  work?: string;
  type?: MaterialType;
  priority?: WishPriority;
  keyword?: string;
}

export interface FieldMapping {
  csvHeader: string;
  targetField: string;
}

export type ValidationStatus = 'success' | 'warning' | 'error' | 'duplicate';

export interface RowValidationResult {
  rowIndex: number;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  material?: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>;
  characterNames: string[];
  staffNames: string[];
  duplicateInfo?: {
    similarMaterials: {
      material: Material;
      matchReasons: string[];
      similarityScore: number;
    }[];
  };
  originalRow: CSVRow;
}

export interface CharacterPreview {
  name: string;
  work: string;
  isNew: boolean;
}

export interface StaffPreview {
  name: string;
  role: string;
  isNew: boolean;
}

export interface PreflightSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  newCharacters: CharacterPreview[];
  existingCharacters: CharacterPreview[];
  newStaff: StaffPreview[];
  existingStaff: StaffPreview[];
  fieldsWithIssues: string[];
}

export interface PreflightResult {
  fieldMappings: FieldMapping[];
  rowResults: RowValidationResult[];
  summary: PreflightSummary;
  csvHeaders: string[];
  rawData: CSVRow[];
}

export interface ImportResult {
  success: number;
  skippedByUser: number;
  skippedByError: number;
}

export interface WorkInfo {
  workName: string;
  isFavorite: boolean;
  notes: string;
  updatedAt: string;
}
