import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Plus,
  Trash2,
  RotateCcw,
  Clock,
  FileText,
  Users,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  ArrowRight,
  Save,
  BookMarked,
  Download,
  Upload,
  Edit3,
  Info,
  Archive,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';

interface SnapshotData {
  materials: ReturnType<typeof useStore.getState>['materials'];
  characters: ReturnType<typeof useStore.getState>['characters'];
  staff: ReturnType<typeof useStore.getState>['staff'];
  scanTasks: ReturnType<typeof useStore.getState>['scanTasks'];
  wishItems: ReturnType<typeof useStore.getState>['wishItems'];
  workInfos: ReturnType<typeof useStore.getState>['workInfos'];
}

interface Snapshot {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  data: SnapshotData;
}

const BACKUP_STORAGE_KEY = 'animation-backups';

function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const snapshots = JSON.parse(raw) as Snapshot[];
    return snapshots.map((snapshot) => ({
      ...snapshot,
      data: {
        ...snapshot.data,
        scanTasks: snapshot.data.scanTasks || {},
        wishItems: snapshot.data.wishItems || [],
        workInfos: snapshot.data.workInfos || {},
      },
    }));
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: Snapshot[]) {
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(snapshots));
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = JSON.parse(e.target?.result as string);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function isValidSnapshot(data: unknown): data is Snapshot {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.label === 'string' &&
    typeof d.createdAt === 'string' &&
    typeof d.data === 'object' &&
    d.data !== null &&
    Array.isArray((d.data as Record<string, unknown>).materials) &&
    Array.isArray((d.data as Record<string, unknown>).characters) &&
    Array.isArray((d.data as Record<string, unknown>).staff)
  );
}

function isValidSnapshotArray(data: unknown): data is Snapshot[] {
  if (!Array.isArray(data)) return false;
  return data.every(isValidSnapshot);
}

interface DiffSummary {
  materialsAdded: number;
  materialsRemoved: number;
  materialsChanged: number;
  charactersAdded: number;
  charactersRemoved: number;
  charactersChanged: number;
  staffAdded: number;
  staffRemoved: number;
  staffChanged: number;
  wishItemsAdded: number;
  wishItemsRemoved: number;
  wishItemsChanged: number;
  scanTasksChanged: number;
  workInfosChanged: number;
}

function countChangedById<T extends { id: string }>(
  current: T[],
  snapshot: T[],
): number {
  const currentMap = new Map(current.map((item) => [item.id, item]));
  let changed = 0;
  snapshot.forEach((sItem) => {
    const cItem = currentMap.get(sItem.id);
    if (cItem && JSON.stringify(cItem) !== JSON.stringify(sItem)) {
      changed++;
    }
  });
  return changed;
}

function computeDiff(current: SnapshotData, snapshot: SnapshotData): DiffSummary {
  const currentMaterialIds = new Set(current.materials.map((m) => m.id));
  const snapshotMaterialIds = new Set(snapshot.materials.map((m) => m.id));
  let materialsAdded = 0;
  let materialsRemoved = 0;
  snapshot.materials.forEach((m) => { if (!currentMaterialIds.has(m.id)) materialsAdded++; });
  current.materials.forEach((m) => { if (!snapshotMaterialIds.has(m.id)) materialsRemoved++; });
  const materialsChanged = countChangedById(current.materials, snapshot.materials);

  const currentCharIds = new Set(current.characters.map((c) => c.id));
  const snapshotCharIds = new Set(snapshot.characters.map((c) => c.id));
  let charactersAdded = 0;
  let charactersRemoved = 0;
  snapshot.characters.forEach((c) => { if (!currentCharIds.has(c.id)) charactersAdded++; });
  current.characters.forEach((c) => { if (!snapshotCharIds.has(c.id)) charactersRemoved++; });
  const charactersChanged = countChangedById(current.characters, snapshot.characters);

  const currentStaffIds = new Set(current.staff.map((s) => s.id));
  const snapshotStaffIds = new Set(snapshot.staff.map((s) => s.id));
  let staffAdded = 0;
  let staffRemoved = 0;
  snapshot.staff.forEach((s) => { if (!currentStaffIds.has(s.id)) staffAdded++; });
  current.staff.forEach((s) => { if (!snapshotStaffIds.has(s.id)) staffRemoved++; });
  const staffChanged = countChangedById(current.staff, snapshot.staff);

  const currentWishIds = new Set(current.wishItems.map((w) => w.id));
  const snapshotWishIds = new Set(snapshot.wishItems.map((w) => w.id));
  let wishItemsAdded = 0;
  let wishItemsRemoved = 0;
  snapshot.wishItems.forEach((w) => { if (!currentWishIds.has(w.id)) wishItemsAdded++; });
  current.wishItems.forEach((w) => { if (!snapshotWishIds.has(w.id)) wishItemsRemoved++; });
  const wishItemsChanged = countChangedById(current.wishItems, snapshot.wishItems);

  const currentScanKeys = Object.keys(current.scanTasks);
  const snapshotScanKeys = Object.keys(snapshot.scanTasks);
  let scanTasksChanged = 0;
  snapshotScanKeys.forEach((k) => { if (!currentScanKeys.includes(k)) scanTasksChanged++; });
  currentScanKeys.forEach((k) => { if (!snapshotScanKeys.includes(k)) scanTasksChanged++; });
  const commonScanKeys = currentScanKeys.filter((k) => snapshotScanKeys.includes(k));
  commonScanKeys.forEach((k) => {
    if (JSON.stringify(current.scanTasks[k]) !== JSON.stringify(snapshot.scanTasks[k])) {
      scanTasksChanged++;
    }
  });

  const currentWorkInfoKeys = Object.keys(current.workInfos || {});
  const snapshotWorkInfoKeys = Object.keys(snapshot.workInfos || {});
  let workInfosChanged = 0;
  snapshotWorkInfoKeys.forEach((k) => { if (!currentWorkInfoKeys.includes(k)) workInfosChanged++; });
  currentWorkInfoKeys.forEach((k) => { if (!snapshotWorkInfoKeys.includes(k)) workInfosChanged++; });
  const commonWorkInfoKeys = currentWorkInfoKeys.filter((k) => snapshotWorkInfoKeys.includes(k));
  commonWorkInfoKeys.forEach((k) => {
    if (JSON.stringify(current.workInfos?.[k]) !== JSON.stringify(snapshot.workInfos?.[k])) {
      workInfosChanged++;
    }
  });

  return {
    materialsAdded,
    materialsRemoved,
    materialsChanged,
    charactersAdded,
    charactersRemoved,
    charactersChanged,
    staffAdded,
    staffRemoved,
    staffChanged,
    wishItemsAdded,
    wishItemsRemoved,
    wishItemsChanged,
    scanTasksChanged,
    workInfosChanged,
  };
}

export function BackupCenter() {
  const materials = useStore((s) => s.materials);
  const characters = useStore((s) => s.characters);
  const staff = useStore((s) => s.staff);
  const scanTasks = useStore((s) => s.scanTasks);
  const wishItems = useStore((s) => s.wishItems);
  const workInfos = useStore((s) => s.workInfos);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [diffModal, setDiffModal] = useState<{
    snapshot: Snapshot;
    diff: DiffSummary;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [renameDescription, setRenameDescription] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Snapshot[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleCreateSnapshot = useCallback(() => {
    const label = snapshotLabel.trim() || `快照 ${snapshots.length + 1}`;
    const newSnapshot: Snapshot = {
      id: generateId(),
      label,
      description: snapshotDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      data: {
        materials: JSON.parse(JSON.stringify(materials)),
        characters: JSON.parse(JSON.stringify(characters)),
        staff: JSON.parse(JSON.stringify(staff)),
        scanTasks: JSON.parse(JSON.stringify(scanTasks)),
        wishItems: JSON.parse(JSON.stringify(wishItems)),
        workInfos: JSON.parse(JSON.stringify(workInfos)),
      },
    };
    const updated = [newSnapshot, ...snapshots];
    saveSnapshots(updated);
    setSnapshots(updated);
    setSnapshotLabel('');
    setSnapshotDescription('');
    setShowCreateInput(false);
    showSuccess('快照创建成功');
  }, [snapshotLabel, snapshotDescription, snapshots, materials, characters, staff, scanTasks, wishItems, workInfos, showSuccess]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    saveSnapshots(updated);
    setSnapshots(updated);
    setConfirmDeleteId(null);
    if (expandedId === id) setExpandedId(null);
    showSuccess('快照已删除');
  }, [snapshots, expandedId, showSuccess]);

  const handleStartRename = useCallback((snapshot: Snapshot) => {
    setRenamingId(snapshot.id);
    setRenameLabel(snapshot.label);
    setRenameDescription(snapshot.description || '');
  }, []);

  const handleSaveRename = useCallback(() => {
    if (!renamingId) return;
    const updated = snapshots.map((s) =>
      s.id === renamingId
        ? { ...s, label: renameLabel.trim() || s.label, description: renameDescription.trim() || undefined }
        : s
    );
    saveSnapshots(updated);
    setSnapshots(updated);
    setRenamingId(null);
    setRenameLabel('');
    setRenameDescription('');
    showSuccess('快照已重命名');
  }, [renamingId, renameLabel, renameDescription, snapshots, showSuccess]);

  const handlePrepareRestore = useCallback((snapshot: Snapshot) => {
    const current: SnapshotData = {
      materials,
      characters,
      staff,
      scanTasks,
      wishItems,
      workInfos,
    };
    const diff = computeDiff(current, snapshot.data);
    setDiffModal({ snapshot, diff });
  }, [materials, characters, staff, scanTasks, wishItems, workInfos]);

  const handleConfirmRestore = useCallback(() => {
    if (!diffModal) return;
    const { data } = diffModal.snapshot;
    useStore.setState({
      materials: data.materials,
      characters: data.characters,
      staff: data.staff,
      scanTasks: data.scanTasks,
      wishItems: data.wishItems,
      workInfos: data.workInfos || {},
    });
    setDiffModal(null);
    showSuccess('数据已恢复到快照版本');
  }, [diffModal, showSuccess]);

  const handleExportSnapshot = useCallback((snapshot: Snapshot) => {
    const filename = `快照_${snapshot.label}_${snapshot.createdAt.split('T')[0]}.json`;
    const exportData = {
      type: 'animation-archive-snapshot',
      version: 1,
      exportedAt: new Date().toISOString(),
      snapshot,
    };
    downloadJSON(exportData, filename);
    showSuccess('快照已导出');
  }, [showSuccess]);

  const handleExportAll = useCallback(() => {
    const filename = `全部快照_${new Date().toISOString().split('T')[0]}.json`;
    const exportData = {
      type: 'animation-archive-snapshots',
      version: 1,
      exportedAt: new Date().toISOString(),
      snapshots,
    };
    downloadJSON(exportData, filename);
    showSuccess('全部快照已导出');
  }, [snapshots, showSuccess]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJSONFile(file);
      setImportError(null);

      const obj = data as Record<string, unknown>;
      let importedSnapshots: Snapshot[] = [];

      if (obj.type === 'animation-archive-snapshots' && isValidSnapshotArray(obj.snapshots)) {
        importedSnapshots = obj.snapshots as Snapshot[];
      } else if (obj.type === 'animation-archive-snapshot' && isValidSnapshot(obj.snapshot)) {
        importedSnapshots = [obj.snapshot as Snapshot];
      } else if (isValidSnapshotArray(data)) {
        importedSnapshots = data as Snapshot[];
      } else if (isValidSnapshot(data)) {
        importedSnapshots = [data as Snapshot];
      } else {
        setImportError('文件格式不正确，无法识别为有效的快照文件');
        setImportPreview(null);
        return;
      }

      importedSnapshots = importedSnapshots.map((s) => ({
        ...s,
        id: generateId(),
        label: `${s.label} (已导入)`,
      }));

      setImportPreview(importedSnapshots);
    } catch {
      setImportError('文件读取失败，请确保是有效的 JSON 文件');
      setImportPreview(null);
    }
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!importPreview) return;
    const updated = [...importPreview, ...snapshots];
    saveSnapshots(updated);
    setSnapshots(updated);
    setShowImportModal(false);
    setImportPreview(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showSuccess(`成功导入 ${importPreview.length} 个快照`);
  }, [importPreview, snapshots, showSuccess]);

  const handleCloseImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportPreview(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const diffHasChanges = diffModal
    ? diffModal.diff.materialsAdded > 0 ||
      diffModal.diff.materialsRemoved > 0 ||
      diffModal.diff.materialsChanged > 0 ||
      diffModal.diff.charactersAdded > 0 ||
      diffModal.diff.charactersRemoved > 0 ||
      diffModal.diff.charactersChanged > 0 ||
      diffModal.diff.staffAdded > 0 ||
      diffModal.diff.staffRemoved > 0 ||
      diffModal.diff.staffChanged > 0 ||
      diffModal.diff.wishItemsAdded > 0 ||
      diffModal.diff.wishItemsRemoved > 0 ||
      diffModal.diff.wishItemsChanged > 0 ||
      diffModal.diff.scanTasksChanged > 0 ||
      diffModal.diff.workInfosChanged > 0
    : false;

  return (
    <div className="space-y-6 animate-fade-in">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 shadow-lg backdrop-blur-sm">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold gradient-text mb-2">
            本地备份与恢复中心
          </h1>
          <p className="text-gray-400">
            创建收藏数据快照，随时恢复到历史版本，所有数据均保存在浏览器本地
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 border border-accent-500/20 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            导入快照
          </button>
          {snapshots.length > 0 && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 border border-accent-500/20 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              导出全部
            </button>
          )}
          <button
            onClick={() => setShowCreateInput(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            创建快照
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-accent-500/20">
              <FileText className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">当前资料</p>
              <p className="text-2xl font-bold text-white">{materials.length}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">当前角色</p>
              <p className="text-2xl font-bold text-white">{characters.length}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/20">
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">当前制作人员</p>
              <p className="text-2xl font-bold text-white">{staff.length}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">已保存快照</p>
              <p className="text-2xl font-bold text-white">{snapshots.length}</p>
            </div>
          </div>
        </div>
      </div>

      {showCreateInput && (
        <div className="glass rounded-xl p-4 border border-accent-500/30 animate-fade-in space-y-3">
          <div className="flex items-center gap-3">
            <Save className="w-5 h-5 text-accent-400 flex-shrink-0" />
            <input
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="为快照命名（可选）"
              className="flex-1 px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500/50 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSnapshot();
              }}
              autoFocus
            />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5" />
            <textarea
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              placeholder="添加快照描述（可选）"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500/50 text-sm resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowCreateInput(false); setSnapshotLabel(''); setSnapshotDescription(''); }}
              className="px-4 py-2 rounded-lg bg-primary-700/50 text-gray-400 hover:text-white hover:bg-primary-700 transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm font-medium"
            >
              确认创建
            </button>
          </div>
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Database className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            暂无备份快照
          </h2>
          <p className="text-gray-400">
            点击右上角「创建快照」按钮，保存当前数据状态
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot) => {
            const isExpanded = expandedId === snapshot.id;
            const isConfirmingDelete = confirmDeleteId === snapshot.id;
            const isRenaming = renamingId === snapshot.id;

            return (
              <div
                key={snapshot.id}
                className="glass rounded-xl overflow-hidden border border-accent-500/20"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : snapshot.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-primary-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <Database className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white flex items-center gap-2">
                        {snapshot.label}
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary-700/50 text-gray-300">
                          {snapshot.data.materials.length} 资料 / {snapshot.data.characters.length} 角色 / {snapshot.data.staff.length} 制作人员
                        </span>
                      </h3>
                      {snapshot.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                          {snapshot.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-sm text-gray-400">{formatDateTime(snapshot.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-accent-500/10">
                    {isRenaming ? (
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Edit3 className="w-5 h-5 text-accent-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={renameLabel}
                            onChange={(e) => setRenameLabel(e.target.value)}
                            placeholder="快照名称"
                            className="flex-1 px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500/50 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5" />
                          <textarea
                            value={renameDescription}
                            onChange={(e) => setRenameDescription(e.target.value)}
                            placeholder="快照描述（可选）"
                            rows={2}
                            className="flex-1 px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500/50 text-sm resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRenamingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-primary-700/50 text-gray-400 hover:text-white transition-colors text-sm"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveRename}
                            className="px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">资料</p>
                            <p className="text-lg font-bold text-white">{snapshot.data.materials.length}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">角色</p>
                            <p className="text-lg font-bold text-white">{snapshot.data.characters.length}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">制作人员</p>
                            <p className="text-lg font-bold text-white">{snapshot.data.staff.length}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">愿望清单</p>
                            <p className="text-lg font-bold text-white">{snapshot.data.wishItems.length}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">扫描任务</p>
                            <p className="text-lg font-bold text-white">{Object.keys(snapshot.data.scanTasks).length}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/10">
                            <p className="text-xs text-gray-500">作品信息</p>
                            <p className="text-lg font-bold text-white">{Object.keys(snapshot.data.workInfos || {}).length}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handlePrepareRestore(snapshot)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm font-medium"
                          >
                            <RotateCcw className="w-4 h-4" />
                            恢复到此快照
                          </button>

                          <button
                            onClick={() => handleStartRename(snapshot)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 border border-accent-500/20 transition-colors text-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                            重命名
                          </button>

                          <button
                            onClick={() => handleExportSnapshot(snapshot)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 border border-accent-500/20 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            导出
                          </button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-sm text-red-400">确认删除？</span>
                              <button
                                onClick={() => handleDeleteSnapshot(snapshot.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm"
                              >
                                确认
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1.5 rounded-lg bg-primary-700/50 text-gray-400 hover:text-white transition-colors text-sm"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(snapshot.id)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm ml-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={diffModal !== null}
        onClose={() => setDiffModal(null)}
        title="恢复确认 — 数据差异摘要"
        size="lg"
      >
        {diffModal && (
          <div className="space-y-5">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-300 font-medium">
                    恢复操作将覆盖当前所有数据
                  </p>
                  <p className="text-sm text-yellow-400/80 mt-1">
                    以下为当前数据与快照「{diffModal.snapshot.label}」之间的差异，请仔细核对后再确认恢复。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-accent-300 font-medium">
                    将被替换的数据范围
                  </p>
                  <ul className="text-sm text-gray-400 mt-2 space-y-1">
                    <li>• 资料列表（{diffModal.snapshot.data.materials.length} 条）</li>
                    <li>• 角色列表（{diffModal.snapshot.data.characters.length} 条）</li>
                    <li>• 制作人员列表（{diffModal.snapshot.data.staff.length} 条）</li>
                    <li>• 扫描任务（{Object.keys(diffModal.snapshot.data.scanTasks).length} 项）</li>
                    <li>• 愿望清单（{diffModal.snapshot.data.wishItems.length} 条）</li>
                    <li>• 作品备注（{Object.keys(diffModal.snapshot.data.workInfos || {}).length} 条）</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">详细差异</h4>
              <DiffRow
                label="资料"
                current={materials.length}
                target={diffModal.snapshot.data.materials.length}
                added={diffModal.diff.materialsAdded}
                removed={diffModal.diff.materialsRemoved}
                changed={diffModal.diff.materialsChanged}
                icon={<FileText className="w-4 h-4 text-accent-400" />}
              />
              <DiffRow
                label="角色"
                current={characters.length}
                target={diffModal.snapshot.data.characters.length}
                added={diffModal.diff.charactersAdded}
                removed={diffModal.diff.charactersRemoved}
                changed={diffModal.diff.charactersChanged}
                icon={<Users className="w-4 h-4 text-blue-400" />}
              />
              <DiffRow
                label="制作人员"
                current={staff.length}
                target={diffModal.snapshot.data.staff.length}
                added={diffModal.diff.staffAdded}
                removed={diffModal.diff.staffRemoved}
                changed={diffModal.diff.staffChanged}
                icon={<UserCheck className="w-4 h-4 text-green-400" />}
              />
              <DiffRow
                label="愿望清单"
                current={wishItems.length}
                target={diffModal.snapshot.data.wishItems.length}
                added={diffModal.diff.wishItemsAdded}
                removed={diffModal.diff.wishItemsRemoved}
                changed={diffModal.diff.wishItemsChanged}
                icon={<Save className="w-4 h-4 text-pink-400" />}
              />
              {diffModal.diff.scanTasksChanged > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">扫描任务有 {diffModal.diff.scanTasksChanged} 项变更</span>
                </div>
              )}
              {diffModal.diff.workInfosChanged > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <BookMarked className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">作品信息有 {diffModal.diff.workInfosChanged} 项变更</span>
                </div>
              )}
            </div>

            {!diffHasChanges && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-green-300">当前数据与快照完全一致，无需恢复</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDiffModal(null)}
                className="px-4 py-2 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={!diffHasChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  diffHasChanges
                    ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30'
                    : 'bg-primary-700/30 text-gray-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                确认恢复
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
        title="导入快照"
        size="md"
      >
        <div className="space-y-5">
          <div className="border-2 border-dashed border-accent-500/30 rounded-xl p-8 text-center hover:border-accent-500/50 transition-colors">
            <Archive className="w-12 h-12 mx-auto text-accent-500 mb-4" />
            <p className="text-white mb-2">选择快照文件</p>
            <p className="text-gray-400 text-sm mb-4">支持 JSON 格式的快照文件</p>
            <label className="inline-flex items-center gap-2 px-5 py-2 rounded-lg btn-secondary text-white cursor-pointer">
              <Upload className="w-4 h-4" />
              选择文件
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {importError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-300">{importError}</p>
              </div>
            </div>
          )}

          {importPreview && importPreview.length > 0 && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-300 font-medium">
                  检测到 {importPreview.length} 个快照
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {importPreview.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-800/50">
                    <Database className="w-4 h-4 text-purple-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.label}</p>
                      <p className="text-xs text-gray-400">
                        {s.data.materials.length} 资料 / {s.data.characters.length} 角色
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleCloseImportModal}
              className="px-4 py-2 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!importPreview || importPreview.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importPreview && importPreview.length > 0
                  ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30'
                  : 'bg-primary-700/30 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              确认导入
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DiffRow({
  label,
  current,
  target,
  added,
  removed,
  changed,
  icon,
}: {
  label: string;
  current: number;
  target: number;
  added: number;
  removed: number;
  changed: number;
  icon: React.ReactNode;
}) {
  const hasChange = added > 0 || removed > 0 || changed > 0;

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
      hasChange ? 'bg-primary-800/30 border-accent-500/20' : 'bg-primary-800/10 border-transparent'
    }`}>
      {icon}
      <span className="text-sm text-gray-300 w-20">{label}</span>
      <span className="text-sm text-white font-mono">{current}</span>
      <ArrowRight className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-white font-mono">{target}</span>
      <div className="flex-1" />
      {hasChange ? (
        <div className="flex items-center gap-2">
          {added > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <XCircle className="w-3 h-3 rotate-180" />
              +{added}
            </span>
          )}
          {removed > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              -{removed}
            </span>
          )}
          {changed > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              ~{changed}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-gray-500">无变化</span>
      )}
    </div>
  );
}
