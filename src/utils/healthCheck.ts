import { Material, Character, Staff, ScanStatus } from '../types';

export type HealthIssueType =
  | 'missing_work'
  | 'invalid_page_range'
  | 'scan_status_mismatch'
  | 'character_no_work'
  | 'staff_no_role';

export interface HealthIssue {
  id: string;
  type: HealthIssueType;
  severity: 'error' | 'warning';
  title: string;
  description: string;
  entityType: 'material' | 'character' | 'staff';
  entityId: string;
  entityName: string;
  fixAction: 'edit_material' | 'go_to_tags';
}

export interface HealthIssueGroup {
  type: HealthIssueType;
  title: string;
  description: string;
  icon: string;
  issues: HealthIssue[];
}

export interface FixChange {
  entityId: string;
  entityName: string;
  entityType: 'material' | 'character' | 'staff';
  field: string;
  fieldLabel: string;
  oldValue: string | number;
  newValue: string | number;
  autoDetermined: boolean;
}

export interface FixPreview {
  type: HealthIssueType;
  title: string;
  canAutoFix: boolean;
  autoFixCount: number;
  manualFixCount: number;
  totalCount: number;
  changes: FixChange[];
  requiresInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputField?: string;
}

export interface MaterialFixResult {
  id: string;
  updates: Partial<Material>;
}

export interface CharacterFixResult {
  id: string;
  updates: Partial<Character>;
}

export interface FixExecutionResult {
  materialUpdates: MaterialFixResult[];
  characterUpdates: CharacterFixResult[];
  fixedCount: number;
  skippedCount: number;
}

const issueTypeConfig: Record<HealthIssueType, { title: string; description: string; icon: string; severity: 'error' | 'warning' }> = {
  missing_work: {
    title: '资料缺少作品名',
    description: '这些资料没有填写所属作品名称，可能影响分类和检索',
    icon: '📚',
    severity: 'warning',
  },
  invalid_page_range: {
    title: '页码范围不合理',
    description: '这些资料的起始页码、结束页码或总页数存在逻辑问题',
    icon: '📄',
    severity: 'error',
  },
  scan_status_mismatch: {
    title: '扫描状态与页码标注不一致',
    description: '扫描状态与实际页码标注数量存在矛盾',
    icon: '📷',
    severity: 'warning',
  },
  character_no_work: {
    title: '角色缺少所属作品',
    description: '这些角色标签没有填写所属作品名称',
    icon: '👤',
    severity: 'warning',
  },
  staff_no_role: {
    title: '制作人员缺少职务',
    description: '这些制作人员标签没有填写职务信息',
    icon: '🎬',
    severity: 'warning',
  },
};

export const checkMissingWork = (materials: Material[]): HealthIssue[] => {
  return materials
    .filter((m) => !m.work || !m.work.trim())
    .map((m) => ({
      id: `missing_work_${m.id}`,
      type: 'missing_work' as HealthIssueType,
      severity: 'warning',
      title: '缺少作品名',
      description: `资料「${m.title}」没有填写所属作品名称`,
      entityType: 'material',
      entityId: m.id,
      entityName: m.title,
      fixAction: 'edit_material',
    }));
};

export const checkInvalidPageRange = (materials: Material[]): HealthIssue[] => {
  const issues: HealthIssue[] = [];

  materials.forEach((m) => {
    if (m.pageCount <= 0) return;

    const problems: string[] = [];

    if (m.pageStart < 1) {
      problems.push('起始页码小于 1');
    }
    if (m.pageEnd > 0 && m.pageEnd < m.pageStart) {
      problems.push('结束页码小于起始页码');
    }

    if (m.type === 'magazine') {
      const span = m.pageEnd - m.pageStart + 1;
      if (span !== m.pageCount) {
        problems.push(`页码跨度（${span}）与切出页数（${m.pageCount}）不一致`);
      }
    } else {
      if (m.pageEnd > m.pageCount) {
        problems.push('结束页码大于总页数');
      }
    }

    if (problems.length > 0) {
      issues.push({
        id: `invalid_page_${m.id}`,
        type: 'invalid_page_range' as HealthIssueType,
        severity: 'error',
        title: '页码范围不合理',
        description: `资料「${m.title}」：${problems.join('；')}`,
        entityType: 'material',
        entityId: m.id,
        entityName: m.title,
        fixAction: 'edit_material',
      });
    }
  });

  return issues;
};

export const checkScanStatusMismatch = (materials: Material[]): HealthIssue[] => {
  const issues: HealthIssue[] = [];

  materials.forEach((m) => {
    const hasPageRefs = m.pageReferences && m.pageReferences.length > 0;

    if (m.scanStatus === 'completed' && !hasPageRefs) {
      issues.push({
        id: `scan_mismatch_${m.id}`,
        type: 'scan_status_mismatch' as HealthIssueType,
        severity: 'warning',
        title: '扫描状态与页码标注不一致',
        description: `资料「${m.title}」标记为已完成扫描，但没有任何页码标注`,
        entityType: 'material',
        entityId: m.id,
        entityName: m.title,
        fixAction: 'edit_material',
      });
    }

    if (m.scanStatus === 'unscanned' && hasPageRefs) {
      issues.push({
        id: `scan_mismatch_${m.id}`,
        type: 'scan_status_mismatch' as HealthIssueType,
        severity: 'warning',
        title: '扫描状态与页码标注不一致',
        description: `资料「${m.title}」标记为未扫描，但已有 ${m.pageReferences.length} 条页码标注`,
        entityType: 'material',
        entityId: m.id,
        entityName: m.title,
        fixAction: 'edit_material',
      });
    }
  });

  return issues;
};

export const checkCharacterNoWork = (characters: Character[]): HealthIssue[] => {
  return characters
    .filter((c) => !c.work || !c.work.trim())
    .map((c) => ({
      id: `char_no_work_${c.id}`,
      type: 'character_no_work' as HealthIssueType,
      severity: 'warning',
      title: '角色缺少所属作品',
      description: `角色「${c.name}」没有填写所属作品名称`,
      entityType: 'character',
      entityId: c.id,
      entityName: c.name,
      fixAction: 'go_to_tags',
    }));
};

export const checkStaffNoRole = (staff: Staff[]): HealthIssue[] => {
  return staff
    .filter((s) => !s.role || !s.role.trim())
    .map((s) => ({
      id: `staff_no_role_${s.id}`,
      type: 'staff_no_role' as HealthIssueType,
      severity: 'warning',
      title: '制作人员缺少职务',
      description: `制作人员「${s.name}」没有填写职务信息`,
      entityType: 'staff',
      entityId: s.id,
      entityName: s.name,
      fixAction: 'go_to_tags',
    }));
};

const inferWorkFromCharacters = (material: Material, characters: Character[]): string | null => {
  if (!material.characterIds || material.characterIds.length === 0) return null;

  const charWorks = material.characterIds
    .map((cid) => characters.find((c) => c.id === cid))
    .filter((c): c is Character => c !== undefined && !!c.work && c.work.trim().length > 0)
    .map((c) => c.work.trim());

  if (charWorks.length === 0) return null;

  const uniqueWorks = Array.from(new Set(charWorks));
  if (uniqueWorks.length === 1) return uniqueWorks[0];

  return null;
};

const inferWorkFromMaterials = (character: Character, materials: Material[]): string | null => {
  const relatedMaterials = materials.filter((m) => m.characterIds && m.characterIds.includes(character.id));
  const materialWorks = relatedMaterials
    .filter((m) => !!m.work && m.work.trim().length > 0)
    .map((m) => m.work.trim());

  if (materialWorks.length === 0) return null;

  const uniqueWorks = Array.from(new Set(materialWorks));
  if (uniqueWorks.length === 1) return uniqueWorks[0];

  return null;
};

export const generateMissingWorkFixPreview = (
  materials: Material[],
  characters: Character[]
): FixPreview => {
  const changes: FixChange[] = [];
  let autoFixCount = 0;
  let manualFixCount = 0;

  materials.forEach((m) => {
    if (!m.work || !m.work.trim()) {
      const inferredWork = inferWorkFromCharacters(m, characters);
      if (inferredWork) {
        changes.push({
          entityId: m.id,
          entityName: m.title,
          entityType: 'material',
          field: 'work',
          fieldLabel: '作品名',
          oldValue: '(空)',
          newValue: inferredWork,
          autoDetermined: true,
        });
        autoFixCount++;
      } else {
        changes.push({
          entityId: m.id,
          entityName: m.title,
          entityType: 'material',
          field: 'work',
          fieldLabel: '作品名',
          oldValue: '(空)',
          newValue: '(需手动指定)',
          autoDetermined: false,
        });
        manualFixCount++;
      }
    }
  });

  return {
    type: 'missing_work',
    title: issueTypeConfig.missing_work.title,
    canAutoFix: autoFixCount > 0,
    autoFixCount,
    manualFixCount,
    totalCount: autoFixCount + manualFixCount,
    changes,
    requiresInput: manualFixCount > 0,
    inputLabel: '为其余资料批量设置作品名',
    inputPlaceholder: '请输入作品名',
    inputField: 'work',
  };
};

const calculateCorrectPageValues = (material: Material): Partial<Material> | null => {
  if (material.pageCount <= 0) return null;

  const updates: Partial<Material> = {};
  let hasIssues = false;

  let newPageStart = material.pageStart;
  let newPageEnd = material.pageEnd;

  if (material.pageStart < 1) {
    newPageStart = 1;
    hasIssues = true;
  }

  if (material.type === 'magazine') {
    const expectedEnd = newPageStart + material.pageCount - 1;
    if (newPageEnd !== expectedEnd || newPageEnd < newPageStart) {
      newPageEnd = expectedEnd;
      hasIssues = true;
    }
  } else {
    if (newPageEnd <= 0) {
      newPageEnd = material.pageCount;
      hasIssues = true;
    } else if (newPageEnd < newPageStart) {
      newPageEnd = newPageStart;
      hasIssues = true;
    } else if (newPageEnd > material.pageCount) {
      newPageEnd = material.pageCount;
      hasIssues = true;
    }
  }

  if (!hasIssues) return null;

  if (newPageStart !== material.pageStart) {
    updates.pageStart = newPageStart;
  }
  if (newPageEnd !== material.pageEnd) {
    updates.pageEnd = newPageEnd;
  }

  return Object.keys(updates).length > 0 ? updates : null;
};

export const generateInvalidPageRangeFixPreview = (materials: Material[]): FixPreview => {
  const changes: FixChange[] = [];

  materials.forEach((m) => {
    if (m.pageCount <= 0) return;

    const updates = calculateCorrectPageValues(m);
    if (!updates) return;

    if (updates.pageStart !== undefined) {
      changes.push({
        entityId: m.id,
        entityName: m.title,
        entityType: 'material',
        field: 'pageStart',
        fieldLabel: '起始页码',
        oldValue: m.pageStart,
        newValue: updates.pageStart,
        autoDetermined: true,
      });
    }
    if (updates.pageEnd !== undefined) {
      changes.push({
        entityId: m.id,
        entityName: m.title,
        entityType: 'material',
        field: 'pageEnd',
        fieldLabel: '结束页码',
        oldValue: m.pageEnd,
        newValue: updates.pageEnd,
        autoDetermined: true,
      });
    }
  });

  const affectedMaterials = new Set(changes.map((c) => c.entityId)).size;

  return {
    type: 'invalid_page_range',
    title: issueTypeConfig.invalid_page_range.title,
    canAutoFix: affectedMaterials > 0,
    autoFixCount: affectedMaterials,
    manualFixCount: 0,
    totalCount: affectedMaterials,
    changes,
    requiresInput: false,
  };
};

const getCorrectScanStatus = (material: Material): ScanStatus | null => {
  const hasPageRefs = material.pageReferences && material.pageReferences.length > 0;

  if (material.scanStatus === 'completed' && !hasPageRefs) {
    return 'unscanned';
  }
  if (material.scanStatus === 'unscanned' && hasPageRefs) {
    return 'completed';
  }

  return null;
};

export const generateScanStatusMismatchFixPreview = (materials: Material[]): FixPreview => {
  const changes: FixChange[] = [];

  materials.forEach((m) => {
    const newStatus = getCorrectScanStatus(m);
    if (newStatus) {
      const statusLabels: Record<ScanStatus, string> = {
        unscanned: '未扫描',
        partial: '部分扫描',
        completed: '已完成',
      };
      changes.push({
        entityId: m.id,
        entityName: m.title,
        entityType: 'material',
        field: 'scanStatus',
        fieldLabel: '扫描状态',
        oldValue: statusLabels[m.scanStatus],
        newValue: statusLabels[newStatus],
        autoDetermined: true,
      });
    }
  });

  return {
    type: 'scan_status_mismatch',
    title: issueTypeConfig.scan_status_mismatch.title,
    canAutoFix: changes.length > 0,
    autoFixCount: changes.length,
    manualFixCount: 0,
    totalCount: changes.length,
    changes,
    requiresInput: false,
  };
};

export const generateCharacterNoWorkFixPreview = (
  characters: Character[],
  materials: Material[]
): FixPreview => {
  const changes: FixChange[] = [];
  let autoFixCount = 0;
  let manualFixCount = 0;

  characters.forEach((c) => {
    if (!c.work || !c.work.trim()) {
      const inferredWork = inferWorkFromMaterials(c, materials);
      if (inferredWork) {
        changes.push({
          entityId: c.id,
          entityName: c.name,
          entityType: 'character',
          field: 'work',
          fieldLabel: '所属作品',
          oldValue: '(空)',
          newValue: inferredWork,
          autoDetermined: true,
        });
        autoFixCount++;
      } else {
        changes.push({
          entityId: c.id,
          entityName: c.name,
          entityType: 'character',
          field: 'work',
          fieldLabel: '所属作品',
          oldValue: '(空)',
          newValue: '(需手动指定)',
          autoDetermined: false,
        });
        manualFixCount++;
      }
    }
  });

  return {
    type: 'character_no_work',
    title: issueTypeConfig.character_no_work.title,
    canAutoFix: autoFixCount > 0,
    autoFixCount,
    manualFixCount,
    totalCount: autoFixCount + manualFixCount,
    changes,
    requiresInput: manualFixCount > 0,
    inputLabel: '为其余角色批量设置所属作品',
    inputPlaceholder: '请输入作品名',
    inputField: 'work',
  };
};

export const generateFixPreview = (
  type: HealthIssueType,
  materials: Material[],
  characters: Character[]
): FixPreview | null => {
  switch (type) {
    case 'missing_work':
      return generateMissingWorkFixPreview(materials, characters);
    case 'invalid_page_range':
      return generateInvalidPageRangeFixPreview(materials);
    case 'scan_status_mismatch':
      return generateScanStatusMismatchFixPreview(materials);
    case 'character_no_work':
      return generateCharacterNoWorkFixPreview(characters, materials);
    default:
      return null;
  }
};

export const executeFixes = (
  type: HealthIssueType,
  materials: Material[],
  characters: Character[],
  manualInput?: string
): FixExecutionResult => {
  const materialUpdates: MaterialFixResult[] = [];
  const characterUpdates: CharacterFixResult[] = [];
  let fixedCount = 0;
  let skippedCount = 0;

  switch (type) {
    case 'missing_work': {
      materials.forEach((m) => {
        if (!m.work || !m.work.trim()) {
          const inferredWork = inferWorkFromCharacters(m, characters);
          const workToUse = inferredWork || (manualInput && manualInput.trim() ? manualInput.trim() : null);
          if (workToUse) {
            materialUpdates.push({
              id: m.id,
              updates: { work: workToUse },
            });
            fixedCount++;
          } else {
            skippedCount++;
          }
        }
      });
      break;
    }
    case 'invalid_page_range': {
      materials.forEach((m) => {
        if (m.pageCount <= 0) {
          skippedCount++;
          return;
        }
        const updates = calculateCorrectPageValues(m);
        if (updates && Object.keys(updates).length > 0) {
          materialUpdates.push({
            id: m.id,
            updates,
          });
          fixedCount++;
        }
      });
      break;
    }
    case 'scan_status_mismatch': {
      materials.forEach((m) => {
        const newStatus = getCorrectScanStatus(m);
        if (newStatus) {
          materialUpdates.push({
            id: m.id,
            updates: { scanStatus: newStatus },
          });
          fixedCount++;
        }
      });
      break;
    }
    case 'character_no_work': {
      characters.forEach((c) => {
        if (!c.work || !c.work.trim()) {
          const inferredWork = inferWorkFromMaterials(c, materials);
          const workToUse = inferredWork || (manualInput && manualInput.trim() ? manualInput.trim() : null);
          if (workToUse) {
            characterUpdates.push({
              id: c.id,
              updates: { work: workToUse },
            });
            fixedCount++;
          } else {
            skippedCount++;
          }
        }
      });
      break;
    }
    default:
      break;
  }

  return {
    materialUpdates,
    characterUpdates,
    fixedCount,
    skippedCount,
  };
};

export const runAllHealthChecks = (
  materials: Material[],
  characters: Character[],
  staff: Staff[]
): HealthIssueGroup[] => {
  const allIssues: HealthIssue[] = [
    ...checkMissingWork(materials),
    ...checkInvalidPageRange(materials),
    ...checkScanStatusMismatch(materials),
    ...checkCharacterNoWork(characters),
    ...checkStaffNoRole(staff),
  ];

  const groups: HealthIssueGroup[] = [];
  const types: HealthIssueType[] = [
    'missing_work',
    'invalid_page_range',
    'scan_status_mismatch',
    'character_no_work',
    'staff_no_role',
  ];

  types.forEach((type) => {
    const issues = allIssues.filter((i) => i.type === type);
    if (issues.length > 0) {
      const config = issueTypeConfig[type];
      groups.push({
        type,
        title: config.title,
        description: config.description,
        icon: config.icon,
        issues,
      });
    }
  });

  return groups;
};

export const getHealthStats = (groups: HealthIssueGroup[]) => {
  const totalIssues = groups.reduce((sum, g) => sum + g.issues.length, 0);
  const errors = groups.reduce(
    (sum, g) => sum + g.issues.filter((i) => i.severity === 'error').length,
    0
  );
  const warnings = groups.reduce(
    (sum, g) => sum + g.issues.filter((i) => i.severity === 'warning').length,
    0
  );

  return { totalIssues, errors, warnings };
};
