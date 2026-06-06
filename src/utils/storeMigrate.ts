import type { StoreState } from '../store/types';
import type { ScanTask, WorkInfo } from '../types';
import { DEFAULT_DUPLICATE_RULES, type DuplicateCheckRules } from './duplicateCheck';

export const STORAGE_VERSION = 3;
export const STORAGE_NAME = 'animation-material-collection';

type PersistedState = Record<string, unknown>;

function migrateV1ToV2(state: PersistedState): void {
  if (state.scanTasks && typeof state.scanTasks === 'object') {
    const tasks = state.scanTasks as Record<string, Partial<ScanTask>>;
    Object.keys(tasks).forEach((id) => {
      const task = tasks[id];
      if (!task.plannedDate) {
        task.plannedDate = '';
      }
      if (!task.notes) {
        task.notes = '';
      }
    });
  }
}

function migrateV2ToV3(state: PersistedState): void {
  if (!state.workInfos) {
    state.workInfos = {} as Record<string, WorkInfo>;
  }
}

export function migratePersistedState(
  persistedState: unknown,
  version: number
): StoreState {
  const state = persistedState as PersistedState;

  if (version < 2) {
    migrateV1ToV2(state);
  }

  if (version < 3) {
    migrateV2ToV3(state);
  }

  if (!state.duplicateRules) {
    state.duplicateRules = DEFAULT_DUPLICATE_RULES as unknown as DuplicateCheckRules;
  }

  return state as unknown as StoreState;
}

export function createMigrate() {
  return (persistedState: unknown, version: number) => {
    return migratePersistedState(persistedState, version);
  };
}

export function validateStoreState(state: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const s = state as Record<string, unknown>;

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['state 不是对象'] };
  }

  if (!Array.isArray(s.materials)) {
    errors.push('materials 不是数组');
  }
  if (!Array.isArray(s.characters)) {
    errors.push('characters 不是数组');
  }
  if (!Array.isArray(s.staff)) {
    errors.push('staff 不是数组');
  }
  if (!s.scanTasks || typeof s.scanTasks !== 'object') {
    errors.push('scanTasks 不是对象');
  }
  if (!Array.isArray(s.wishItems)) {
    errors.push('wishItems 不是数组');
  }
  if (!s.workInfos || typeof s.workInfos !== 'object') {
    errors.push('workInfos 不是对象');
  }
  if (!s.duplicateRules || typeof s.duplicateRules !== 'object') {
    errors.push('duplicateRules 不是对象');
  }

  if (Array.isArray(s.materials)) {
    (s.materials as unknown[]).forEach((mat, idx) => {
      const m = mat as Record<string, unknown>;
      if (!m.id || typeof m.id !== 'string') {
        errors.push(`materials[${idx}].id 无效`);
      }
      if (!m.title || typeof m.title !== 'string') {
        errors.push(`materials[${idx}].title 无效`);
      }
      if (!Array.isArray(m.characterIds)) {
        errors.push(`materials[${idx}].characterIds 不是数组`);
      }
      if (!Array.isArray(m.staffIds)) {
        errors.push(`materials[${idx}].staffIds 不是数组`);
      }
      if (!Array.isArray(m.pageReferences)) {
        errors.push(`materials[${idx}].pageReferences 不是数组`);
      }
    });
  }

  if (s.scanTasks && typeof s.scanTasks === 'object') {
    Object.entries(s.scanTasks as Record<string, unknown>).forEach(([id, task]) => {
      const t = task as Record<string, unknown>;
      if (typeof t.plannedDate !== 'string') {
        errors.push(`scanTasks[${id}].plannedDate 不是字符串`);
      }
      if (typeof t.notes !== 'string') {
        errors.push(`scanTasks[${id}].notes 不是字符串`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function getCurrentStorageVersion(): number {
  return STORAGE_VERSION;
}
