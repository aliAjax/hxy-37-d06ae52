import { Material, Character, Staff } from '../types';

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
    if (m.pageEnd > m.pageCount) {
      problems.push('结束页码大于总页数');
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
