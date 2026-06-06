import { describe, it, expect } from 'vitest';
import {
  migratePersistedState,
  validateStoreState,
  getCurrentStorageVersion,
  STORAGE_VERSION,
} from '../storeMigrate';
import v1Fixture from '../../store/__fixtures__/v1-state.json';
import v2Fixture from '../../store/__fixtures__/v2-state.json';
import { sampleMaterials, sampleCharacters, sampleStaff } from '../../data/sampleData';
import { DEFAULT_DUPLICATE_RULES } from '../duplicateCheck';
import type { StoreState } from '../../store/useStore';

describe('storeMigrate - 版本号', () => {
  it('当前版本号应该为 3', () => {
    expect(STORAGE_VERSION).toBe(3);
    expect(getCurrentStorageVersion()).toBe(3);
  });
});

describe('storeMigrate - v1 -> v3 迁移', () => {
  it('应该能成功迁移 v1 数据到当前版本', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);

    const { valid, errors } = validateStoreState(migrated);
    expect(valid, `迁移后状态无效: ${errors.join(', ')}`).toBe(true);
  });

  it('v1 迁移后 scanTasks 应该有 plannedDate 和 notes 字段', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    const task = migrated.scanTasks['mat_v1_002'];

    expect(task).toBeDefined();
    expect(task.plannedDate).toBe('');
    expect(task.notes).toBe('');
  });

  it('v1 迁移后应该有 workInfos 字段', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    expect(migrated.workInfos).toBeDefined();
    expect(typeof migrated.workInfos).toBe('object');
  });

  it('v1 迁移后 materials 数据不丢失', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    expect(migrated.materials).toHaveLength(2);
    expect(migrated.materials[0].id).toBe('mat_v1_001');
    expect(migrated.materials[1].id).toBe('mat_v1_002');
  });

  it('v1 迁移后 characters 和 staff 数据保持完整', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    expect(migrated.characters).toHaveLength(3);
    expect(migrated.staff).toHaveLength(2);
  });

  it('v1 迁移后 wishItems 数据保持完整', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    expect(migrated.wishItems).toHaveLength(1);
    expect(migrated.wishItems[0].id).toBe('wish_v1_001');
  });

  it('v1 迁移后 duplicateRules 应该存在', () => {
    const migrated = migratePersistedState(v1Fixture.state, v1Fixture.version);
    expect(migrated.duplicateRules).toBeDefined();
    expect(migrated.duplicateRules.weights).toBeDefined();
    expect(migrated.duplicateRules.thresholds).toBeDefined();
  });
});

describe('storeMigrate - v2 -> v3 迁移', () => {
  it('应该能成功迁移 v2 数据到当前版本', () => {
    const migrated = migratePersistedState(v2Fixture.state, v2Fixture.version);

    const { valid, errors } = validateStoreState(migrated);
    expect(valid, `迁移后状态无效: ${errors.join(', ')}`).toBe(true);
  });

  it('v2 迁移后 scanTasks 的 plannedDate 和 notes 应该保留原值', () => {
    const migrated = migratePersistedState(v2Fixture.state, v2Fixture.version);
    const task = migrated.scanTasks['mat_v2_001'];

    expect(task).toBeDefined();
    expect(task.plannedDate).toBe('2024-06-01');
    expect(task.notes).toBe('用高分辨率扫描仪');
  });

  it('v2 迁移后应该有 workInfos 字段', () => {
    const migrated = migratePersistedState(v2Fixture.state, v2Fixture.version);
    expect(migrated.workInfos).toBeDefined();
    expect(typeof migrated.workInfos).toBe('object');
  });

  it('v2 迁移后 materials 数据不丢失', () => {
    const migrated = migratePersistedState(v2Fixture.state, v2Fixture.version);
    expect(migrated.materials).toHaveLength(1);
    expect(migrated.materials[0].id).toBe('mat_v2_001');
  });

  it('v2 迁移后 pageReferences 数据保持完整', () => {
    const migrated = migratePersistedState(v2Fixture.state, v2Fixture.version);
    expect(migrated.materials[0].pageReferences).toHaveLength(1);
    expect(migrated.materials[0].pageReferences[0].id).toBe('pr_v2_001');
  });
});

describe('storeMigrate - v3 (当前版本) 不需要迁移', () => {
  it('当前版本数据迁移后结构不变', () => {
    const currentState = {
      materials: [...sampleMaterials],
      characters: [...sampleCharacters],
      staff: [...sampleStaff],
      scanTasks: {},
      wishItems: [],
      workInfos: {},
      initialized: true,
      duplicateRules: DEFAULT_DUPLICATE_RULES,
    };

    const migrated = migratePersistedState(currentState, STORAGE_VERSION);

    expect(migrated.materials).toHaveLength(sampleMaterials.length);
    expect(migrated.characters).toHaveLength(sampleCharacters.length);
    expect(migrated.staff).toHaveLength(sampleStaff.length);
    expect(migrated.workInfos).toEqual({});
  });
});

describe('storeMigrate - validateStoreState 验证', () => {
  it('sampleData 构造的完整状态应该通过验证', () => {
    const state: StoreState = {
      materials: sampleMaterials,
      characters: sampleCharacters,
      staff: sampleStaff,
      scanTasks: {},
      wishItems: [],
      workInfos: {},
      initialized: false,
      duplicateRules: DEFAULT_DUPLICATE_RULES,
      addMaterial: () => {},
      updateMaterial: () => {},
      deleteMaterial: () => {},
      getMaterial: () => undefined,
      searchMaterials: () => [],
      addCharacter: () => {},
      updateCharacter: () => {},
      deleteCharacter: () => {},
      getOrCreateCharacter: (() => ({})) as never,
      addStaff: () => {},
      updateStaff: () => {},
      deleteStaff: () => {},
      getOrCreateStaff: (() => ({})) as never,
      importFromCSV: () => ({ success: 0, failed: 0, errors: [] }),
      importFromPreflight: () => ({ success: 0, skippedByUser: 0, skippedByError: 0 }),
      exportToCSV: () => '',
      initializeWithSampleData: () => {},
      clearAllData: () => {},
      getWorks: () => [],
      getStats: () => ({
        totalMaterials: 0,
        byType: { artbook: 0, storyboard: 0, setting: 0, magazine: 0, special: 0 },
        totalWorks: 0,
        totalCharacters: 0,
        totalStaff: 0,
        scannedStatus: { unscanned: 0, partial: 0, completed: 0 },
      }),
      setScanTask: () => {},
      getScanTask: () => undefined,
      deleteScanTask: () => {},
      getAllScanTasks: () => [],
      batchSetScanTasks: () => ({ created: 0, updated: 0 }),
      completeMaterialScan: () => {},
      addWishItem: () => {},
      updateWishItem: () => {},
      deleteWishItem: () => {},
      getWishItem: () => undefined,
      convertWishToMaterial: () => {},
      getWishStats: () => ({ total: 0, byPriority: { low: 0, medium: 0, high: 0, urgent: 0 }, totalEstimatedPrice: 0 }),
      batchUpdateMaterials: () => {},
      getWorkInfo: () => undefined,
      setWorkFavorite: () => {},
      setWorkNotes: () => {},
      updateWorkInfo: () => {},
      updateDuplicateRules: () => {},
      resetDuplicateRules: () => {},
    };

    const { valid, errors } = validateStoreState(state);
    expect(valid, `sampleData 状态验证失败: ${errors.join(', ')}`).toBe(true);
  });

  it('缺少 workInfos 的状态应该验证失败', () => {
    const state = {
      materials: [],
      characters: [],
      staff: [],
      scanTasks: {},
      wishItems: [],
      duplicateRules: DEFAULT_DUPLICATE_RULES,
    };

    const { valid, errors } = validateStoreState(state);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('workInfos'))).toBe(true);
  });

  it('scanTasks 缺少 plannedDate 时验证失败', () => {
    const state = {
      materials: [],
      characters: [],
      staff: [],
      scanTasks: {
        'test-id': {
          materialId: 'test-id',
          priority: 'medium',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      },
      wishItems: [],
      workInfos: {},
      duplicateRules: DEFAULT_DUPLICATE_RULES,
    };

    const { valid, errors } = validateStoreState(state);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('plannedDate'))).toBe(true);
  });

  it('无效输入返回验证错误', () => {
    expect(validateStoreState(null).valid).toBe(false);
    expect(validateStoreState(undefined).valid).toBe(false);
    expect(validateStoreState('string').valid).toBe(false);
    expect(validateStoreState(123).valid).toBe(false);
  });
});

describe('storeMigrate - 边界情况', () => {
  it('没有 scanTasks 的 v1 数据也能正常迁移', () => {
    const state = {
      materials: [],
      characters: [],
      staff: [],
      wishItems: [],
      initialized: false,
      duplicateRules: DEFAULT_DUPLICATE_RULES,
    };

    const migrated = migratePersistedState(state, 1);
    expect(migrated.workInfos).toBeDefined();
    expect(migrated.scanTasks).toBeUndefined();
  });

  it('已有 workInfos 的 v2 数据不会被覆盖', () => {
    const state = {
      materials: [],
      characters: [],
      staff: [],
      scanTasks: {},
      wishItems: [],
      workInfos: {
        '某作品': { workName: '某作品', isFavorite: true, notes: '测试笔记', updatedAt: '2024-01-01' },
      },
      initialized: false,
      duplicateRules: DEFAULT_DUPLICATE_RULES,
    };

    const migrated = migratePersistedState(state, 2);
    expect(migrated.workInfos['某作品']).toBeDefined();
    expect(migrated.workInfos['某作品'].isFavorite).toBe(true);
    expect(migrated.workInfos['某作品'].notes).toBe('测试笔记');
  });

  it('空状态数据也能通过迁移', () => {
    const state = {};
    const migrated = migratePersistedState(state, 0);
    expect(migrated).toBeDefined();
    expect(migrated.workInfos).toBeDefined();
  });
});

describe('storeMigrate - sampleData 结构兼容性', () => {
  it('sampleMaterials 中每个材料都有完整字段', () => {
    sampleMaterials.forEach((mat, idx) => {
      expect(mat.id, `materials[${idx}].id`).toBeDefined();
      expect(typeof mat.id, `materials[${idx}].id 类型`).toBe('string');
      expect(mat.title, `materials[${idx}].title`).toBeDefined();
      expect(Array.isArray(mat.characterIds), `materials[${idx}].characterIds`).toBe(true);
      expect(Array.isArray(mat.staffIds), `materials[${idx}].staffIds`).toBe(true);
      expect(Array.isArray(mat.pageReferences), `materials[${idx}].pageReferences`).toBe(true);
    });
  });

  it('sampleCharacters 中每个角色都有完整字段', () => {
    sampleCharacters.forEach((char, idx) => {
      expect(char.id, `characters[${idx}].id`).toBeDefined();
      expect(char.name, `characters[${idx}].name`).toBeDefined();
      expect(char.work, `characters[${idx}].work`).toBeDefined();
    });
  });

  it('sampleStaff 中每个制作人员都有完整字段', () => {
    sampleStaff.forEach((s, idx) => {
      expect(s.id, `staff[${idx}].id`).toBeDefined();
      expect(s.name, `staff[${idx}].name`).toBeDefined();
      expect(s.role, `staff[${idx}].role`).toBeDefined();
      expect(Array.isArray(s.works), `staff[${idx}].works`).toBe(true);
    });
  });
});
