export type MaterialType = 'artbook' | 'storyboard' | 'setting' | 'magazine' | 'special';
export type ScanStatus = 'unscanned' | 'partial' | 'completed';

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
