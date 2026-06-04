import Papa from 'papaparse';
import { Material, MaterialType, ScanStatus, MaterialTypeLabels, ScanStatusLabels } from '../types';

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      encoding: 'UTF-8',
      complete: (results) => {
        resolve(results.data as any[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const exportToCSV = (materials: Material[]): string => {
  const data = materials.map((material) => ({
    标题: material.title,
    类型: MaterialTypeLabels[material.type],
    作品: material.work,
    出版社: material.publisher,
    出版日期: material.publishDate,
    总页数: material.pageCount,
    购买来源: material.purchaseSource,
    扫描状态: ScanStatusLabels[material.scanStatus],
    版权备注: material.copyrightNote,
    收录内容: material.description,
    关联角色: material.characterIds.join('; '),
    关联制作人员: material.staffIds.join('; '),
  }));

  return Papa.unparse(data, {
    header: true,
  });
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const validateMaterialData = (data: any, index: number): { valid: boolean; errors: string[]; material?: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> } => {
  const errors: string[] = [];
  
  if (!data.标题 || !data.标题.trim()) {
    errors.push(`第 ${index + 1} 行: 标题不能为空`);
  }

  const typeMap: Record<string, MaterialType> = {
    '原画集': 'artbook',
    '分镜集': 'storyboard',
    '设定集': 'setting',
    '杂志切页': 'magazine',
    '特典册': 'special',
  };

  const scanStatusMap: Record<string, ScanStatus> = {
    '未扫描': 'unscanned',
    '部分扫描': 'partial',
    '已完成': 'completed',
  };

  const type = typeMap[data.类型] || 'artbook';
  const scanStatus = scanStatusMap[data.扫描状态] || 'unscanned';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    material: {
      title: data.标题?.trim() || '',
      type,
      work: data.作品?.trim() || '',
      publisher: data.出版社?.trim() || '',
      publishDate: data.出版日期?.trim() || '',
      pageCount: parseInt(data.总页数) || 0,
      purchaseSource: data.购买来源?.trim() || '',
      scanStatus,
      copyrightNote: data.版权备注?.trim() || '',
      description: data.收录内容?.trim() || '',
      characterIds: data.关联角色 ? data.关联角色.split(';').map((s: string) => s.trim()).filter(Boolean) : [],
      staffIds: data.关联制作人员 ? data.关联制作人员.split(';').map((s: string) => s.trim()).filter(Boolean) : [],
      pageReferences: [],
    },
  };
};
