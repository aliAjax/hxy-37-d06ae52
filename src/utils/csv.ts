import Papa from 'papaparse';
import {
  Material,
  MaterialType,
  ScanStatus,
  MaterialTypeLabels,
  ScanStatusLabels,
  CSVRow,
  Character,
  Staff,
  FieldMapping,
  RowValidationResult,
  PreflightResult,
  PreflightSummary,
  ValidationStatus,
  CharacterPreview,
  StaffPreview,
} from '../types';
import {
  findSimilarMaterials,
  DEFAULT_DUPLICATE_RULES,
  DuplicateCheckRules,
  SimilarMaterial,
} from './duplicateCheck';

export const TARGET_FIELDS = [
  { key: 'title', label: '标题', required: true },
  { key: 'type', label: '类型', required: false },
  { key: 'work', label: '作品', required: false },
  { key: 'publisher', label: '出版社', required: false },
  { key: 'publishDate', label: '出版日期', required: false },
  { key: 'pageCount', label: '总页数', required: false },
  { key: 'pageStart', label: '起始页码', required: false },
  { key: 'pageEnd', label: '结束页码', required: false },
  { key: 'purchaseSource', label: '购买来源', required: false },
  { key: 'scanStatus', label: '扫描状态', required: false },
  { key: 'copyrightNote', label: '版权备注', required: false },
  { key: 'description', label: '收录内容', required: false },
  { key: 'characters', label: '关联角色', required: false },
  { key: 'staff', label: '关联制作人员', required: false },
];

export const HEADER_TO_FIELD_MAP: Record<string, string> = {
  '标题': 'title',
  '类型': 'type',
  '作品': 'work',
  '出版社': 'publisher',
  '出版日期': 'publishDate',
  '总页数': 'pageCount',
  '起始页码': 'pageStart',
  '结束页码': 'pageEnd',
  '购买来源': 'purchaseSource',
  '扫描状态': 'scanStatus',
  '版权备注': 'copyrightNote',
  '收录内容': 'description',
  '关联角色': 'characters',
  '关联制作人员': 'staff',
};

export const FIELD_TO_HEADER_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(HEADER_TO_FIELD_MAP).map(([k, v]) => [v, k])
);

const TYPE_MAP: Record<string, MaterialType> = {
  '原画集': 'artbook',
  '分镜集': 'storyboard',
  '设定集': 'setting',
  '杂志切页': 'magazine',
  '特典册': 'special',
  'artbook': 'artbook',
  'storyboard': 'storyboard',
  'setting': 'setting',
  'magazine': 'magazine',
  'special': 'special',
};

const SCAN_STATUS_MAP: Record<string, ScanStatus> = {
  '未扫描': 'unscanned',
  '部分扫描': 'partial',
  '已完成': 'completed',
  'unscanned': 'unscanned',
  'partial': 'partial',
  'completed': 'completed',
};

export const parseCSV = (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      encoding: 'UTF-8',
      complete: (results) => {
        resolve(results.data as CSVRow[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const getCSVHeaders = (data: CSVRow[]): string[] => {
  if (data.length === 0) return [];
  return Object.keys(data[0]).filter((k) => k !== '__parsed_extra');
};

export const autoMapFields = (csvHeaders: string[]): FieldMapping[] => {
  return csvHeaders
    .filter((h) => h.trim())
    .map((header) => ({
      csvHeader: header,
      targetField: HEADER_TO_FIELD_MAP[header] || '',
    }));
};

export const applyFieldMapping = (row: CSVRow, mappings: FieldMapping[]): CSVRow => {
  const result: CSVRow = {};
  mappings.forEach((mapping) => {
    if (mapping.targetField) {
      const headerKey = FIELD_TO_HEADER_MAP[mapping.targetField] || mapping.targetField;
      result[headerKey] = row[mapping.csvHeader];
    }
  });
  return result;
};

const convertCharacterIdsToNames = (
  materials: Material[],
  characters: Character[]
): Material[] => {
  const idToNameMap = new Map(characters.map((c) => [c.id, c.name]));
  return materials.map((m) => ({
    ...m,
    characterIds: m.characterIds.map((id) => idToNameMap.get(id) || id),
  }));
};

const validateRowData = (
  mappedRow: CSVRow
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  material?: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>;
  characterNames: string[];
  staffNames: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const title = String(mappedRow.标题 || mappedRow['标题'] || '').trim();
  if (!title) {
    errors.push('标题不能为空');
  }

  const typeRaw = String(mappedRow.类型 || mappedRow['类型'] || '');
  const type = TYPE_MAP[typeRaw] || 'artbook';
  if (typeRaw && !TYPE_MAP[typeRaw]) {
    warnings.push(`类型 "${typeRaw}" 无法识别，默认使用 "原画集"`);
  }

  const scanStatusRaw = String(mappedRow.扫描状态 || mappedRow['扫描状态'] || '');
  const scanStatus = SCAN_STATUS_MAP[scanStatusRaw] || 'unscanned';
  if (scanStatusRaw && !SCAN_STATUS_MAP[scanStatusRaw]) {
    warnings.push(`扫描状态 "${scanStatusRaw}" 无法识别，默认使用 "未扫描"`);
  }

  const pageCountRaw = String(mappedRow.总页数 || mappedRow['总页数'] || '0');
  const pageCount = parseInt(pageCountRaw) || 0;
  if (pageCountRaw && isNaN(parseInt(pageCountRaw))) {
    warnings.push('总页数格式不正确，使用默认值 0');
  }

  const pageStartRaw = String(mappedRow.起始页码 || mappedRow['起始页码'] || '1');
  const pageStart = parseInt(pageStartRaw) || 1;

  const pageEndRaw = String(mappedRow.结束页码 || mappedRow['结束页码'] || String(pageCount));
  const pageEnd = parseInt(pageEndRaw) || pageCount;

  if (pageStart > pageEnd && pageCount > 0) {
    warnings.push('起始页码大于结束页码');
  }

  const work = String(mappedRow.作品 || mappedRow['作品'] || '').trim();
  const publisher = String(mappedRow.出版社 || mappedRow['出版社'] || '').trim();
  const publishDate = String(mappedRow.出版日期 || mappedRow['出版日期'] || '').trim();
  const purchaseSource = String(mappedRow.购买来源 || mappedRow['购买来源'] || '').trim();
  const copyrightNote = String(mappedRow.版权备注 || mappedRow['版权备注'] || '').trim();
  const description = String(mappedRow.收录内容 || mappedRow['收录内容'] || '').trim();

  const charactersRaw = String(mappedRow.关联角色 || mappedRow['关联角色'] || '');
  const characterNames = charactersRaw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const staffRaw = String(mappedRow.关联制作人员 || mappedRow['关联制作人员'] || '');
  const staffNames = staffRaw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!work && characterNames.length > 0) {
    warnings.push('角色已指定但未指定所属作品，角色可能无法正确关联');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      characterNames,
      staffNames,
    };
  }

  return {
    valid: true,
    errors,
    warnings,
    characterNames,
    staffNames,
    material: {
      title,
      type,
      work,
      publisher,
      publishDate,
      pageCount,
      pageStart,
      pageEnd,
      purchaseSource,
      scanStatus,
      copyrightNote,
      description,
      characterIds: characterNames,
      staffIds: staffNames,
      pageReferences: [],
    },
  };
};

export const runPreflight = (
  rawData: CSVRow[],
  fieldMappings: FieldMapping[],
  existingMaterials: Material[],
  existingCharacters: Character[],
  existingStaff: Staff[],
  duplicateRules: DuplicateCheckRules = DEFAULT_DUPLICATE_RULES
): PreflightResult => {
  const csvHeaders = getCSVHeaders(rawData);
  const rowResults: RowValidationResult[] = [];
  const characterKeySet = new Set<string>();
  const staffKeySet = new Set<string>();
  const characterPreviews = new Map<string, CharacterPreview>();
  const staffPreviews = new Map<string, StaffPreview>();
  const fieldsWithIssues = new Set<string>();

  const existingMaterialsWithCharNames = convertCharacterIdsToNames(
    existingMaterials,
    existingCharacters
  );

  rawData.forEach((row, index) => {
    const mappedRow = applyFieldMapping(row, fieldMappings);
    const validation = validateRowData(mappedRow);

    let status: ValidationStatus = 'success';
    if (!validation.valid) {
      status = 'error';
    } else if (validation.warnings.length > 0) {
      status = 'warning';
    }

    let duplicateInfo: { similarMaterials: SimilarMaterial[] } | undefined = undefined;
    if (validation.material) {
      const similar = findSimilarMaterials(
        validation.material,
        existingMaterialsWithCharNames,
        duplicateRules,
        3
      );
      if (similar.length > 0) {
        duplicateInfo = { similarMaterials: similar };
        if (status === 'success') {
          status = 'duplicate';
        }
      }
    }

    if (validation.errors.length > 0) {
      validation.errors.forEach(() => fieldsWithIssues.add('标题'));
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => {
        if (w.includes('类型')) fieldsWithIssues.add('类型');
        if (w.includes('扫描状态')) fieldsWithIssues.add('扫描状态');
        if (w.includes('页数') || w.includes('页码')) fieldsWithIssues.add('页码');
        if (w.includes('角色')) fieldsWithIssues.add('关联角色');
      });
    }

    const work = validation.material?.work || '';
    validation.characterNames.forEach((charName) => {
      const charKey = `${charName}|${work}`;
      if (characterKeySet.has(charKey)) return;
      characterKeySet.add(charKey);

      const isExisting = existingCharacters.some((c) => c.name === charName && c.work === work);
      characterPreviews.set(charKey, {
        name: charName,
        work,
        isNew: !isExisting,
      });
    });

    validation.staffNames.forEach((staffName) => {
      const staffRole = '其他';
      const staffKey = `${staffName}|${staffRole}`;
      if (staffKeySet.has(staffKey)) return;
      staffKeySet.add(staffKey);

      const isExisting = existingStaff.some((s) => s.name === staffName && s.role === staffRole);
      staffPreviews.set(staffKey, {
        name: staffName,
        role: staffRole,
        isNew: !isExisting,
      });
    });

    rowResults.push({
      rowIndex: index,
      status,
      errors: validation.errors,
      warnings: validation.warnings,
      material: validation.material,
      characterNames: validation.characterNames,
      staffNames: validation.staffNames,
      duplicateInfo,
      originalRow: row,
    });
  });

  const summary: PreflightSummary = {
    totalRows: rowResults.length,
    validRows: rowResults.filter((r) => r.status === 'success').length,
    warningRows: rowResults.filter((r) => r.status === 'warning').length,
    errorRows: rowResults.filter((r) => r.status === 'error').length,
    duplicateRows: rowResults.filter((r) => r.status === 'duplicate').length,
    newCharacters: [],
    existingCharacters: [],
    newStaff: [],
    existingStaff: [],
    fieldsWithIssues: Array.from(fieldsWithIssues),
  };

  characterPreviews.forEach((preview) => {
    if (preview.isNew) {
      summary.newCharacters.push(preview);
    } else {
      summary.existingCharacters.push(preview);
    }
  });

  staffPreviews.forEach((preview) => {
    if (preview.isNew) {
      summary.newStaff.push(preview);
    } else {
      summary.existingStaff.push(preview);
    }
  });

  return {
    fieldMappings,
    rowResults,
    summary,
    csvHeaders,
    rawData,
  };
};

export const exportFailedRows = (preflightResult: PreflightResult): string => {
  const failedRows = preflightResult.rowResults
    .filter((r) => r.status === 'error')
    .map((r) => ({
      ...r.originalRow,
      '导入错误': r.errors.join('; '),
    }));

  return Papa.unparse(failedRows, {
    header: true,
  });
};

export const exportToCSV = (
  materials: Material[],
  characters: Character[] = [],
  staffList: Staff[] = []
): string => {
  const data = materials.map((material) => {
    const charNames = material.characterIds
      .map((id) => characters.find((c) => c.id === id)?.name || '')
      .filter(Boolean)
      .join('; ');
    const staffNames = material.staffIds
      .map((id) => staffList.find((s) => s.id === id)?.name || '')
      .filter(Boolean)
      .join('; ');

    return {
      标题: material.title,
      类型: MaterialTypeLabels[material.type],
      作品: material.work,
      出版社: material.publisher,
      出版日期: material.publishDate,
      总页数: material.pageCount,
      起始页码: material.pageStart || 1,
      结束页码: material.pageEnd || material.pageCount,
      购买来源: material.purchaseSource,
      扫描状态: ScanStatusLabels[material.scanStatus],
      版权备注: material.copyrightNote,
      收录内容: material.description,
      关联角色: charNames,
      关联制作人员: staffNames,
    };
  });

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

export const validateMaterialData = (data: CSVRow, index: number): { valid: boolean; errors: string[]; material?: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> } => {
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

  const pageCount = parseInt(String(data.总页数)) || 0;
  const pageStart = parseInt(String(data.起始页码)) || 1;
  const pageEnd = parseInt(String(data.结束页码)) || pageCount;

  return {
    valid: true,
    errors: [],
    material: {
      title: data.标题?.trim() || '',
      type,
      work: data.作品?.trim() || '',
      publisher: data.出版社?.trim() || '',
      publishDate: data.出版日期?.trim() || '',
      pageCount,
      pageStart,
      pageEnd,
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
