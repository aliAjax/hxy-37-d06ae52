import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';

interface SnapshotData {
  materials: ReturnType<typeof useStore.getState>['materials'];
  characters: ReturnType<typeof useStore.getState>['characters'];
  staff: ReturnType<typeof useStore.getState>['staff'];
  scanTasks: ReturnType<typeof useStore.getState>['scanTasks'];
  wishItems: ReturnType<typeof useStore.getState>['wishItems'];
}

interface Snapshot {
  id: string;
  label: string;
  createdAt: string;
  data: SnapshotData;
}

const BACKUP_STORAGE_KEY = 'animation-backups';

function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  };
}

export function BackupCenter() {
  const materials = useStore((s) => s.materials);
  const characters = useStore((s) => s.characters);
  const staff = useStore((s) => s.staff);
  const scanTasks = useStore((s) => s.scanTasks);
  const wishItems = useStore((s) => s.wishItems);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [diffModal, setDiffModal] = useState<{
    snapshot: Snapshot;
    diff: DiffSummary;
  } | null>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const handleCreateSnapshot = useCallback(() => {
    const label = snapshotLabel.trim() || `快照 ${snapshots.length + 1}`;
    const newSnapshot: Snapshot = {
      id: generateId(),
      label,
      createdAt: new Date().toISOString(),
      data: {
        materials: JSON.parse(JSON.stringify(materials)),
        characters: JSON.parse(JSON.stringify(characters)),
        staff: JSON.parse(JSON.stringify(staff)),
        scanTasks: JSON.parse(JSON.stringify(scanTasks)),
        wishItems: JSON.parse(JSON.stringify(wishItems)),
      },
    };
    const updated = [newSnapshot, ...snapshots];
    saveSnapshots(updated);
    setSnapshots(updated);
    setSnapshotLabel('');
    setShowCreateInput(false);
  }, [snapshotLabel, snapshots, materials, characters, staff, scanTasks, wishItems]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    saveSnapshots(updated);
    setSnapshots(updated);
    setConfirmDeleteId(null);
    if (expandedId === id) setExpandedId(null);
  }, [snapshots, expandedId]);

  const handlePrepareRestore = useCallback((snapshot: Snapshot) => {
    const current: SnapshotData = {
      materials,
      characters,
      staff,
      scanTasks,
      wishItems,
    };
    const diff = computeDiff(current, snapshot.data);
    setDiffModal({ snapshot, diff });
  }, [materials, characters, staff, scanTasks, wishItems]);

  const handleConfirmRestore = useCallback(() => {
    if (!diffModal) return;
    const { data } = diffModal.snapshot;
    useStore.setState({
      materials: data.materials,
      characters: data.characters,
      staff: data.staff,
      scanTasks: data.scanTasks,
      wishItems: data.wishItems,
    });
    setDiffModal(null);
  }, [diffModal]);

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
      diffModal.diff.scanTasksChanged > 0
    : false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold gradient-text mb-2">
            本地备份与恢复中心
          </h1>
          <p className="text-gray-400">
            创建收藏数据快照，随时恢复到历史版本，所有数据均保存在浏览器本地
          </p>
        </div>
        <button
          onClick={() => setShowCreateInput(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
          创建快照
        </button>
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
        <div className="glass rounded-xl p-4 border border-accent-500/30 animate-fade-in">
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
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm font-medium"
            >
              确认创建
            </button>
            <button
              onClick={() => { setShowCreateInput(false); setSnapshotLabel(''); }}
              className="px-4 py-2 rounded-lg bg-primary-700/50 text-gray-400 hover:text-white hover:bg-primary-700 transition-colors text-sm"
            >
              取消
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
                    <div className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePrepareRestore(snapshot)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          恢复到此快照
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-400">确认删除此快照？</span>
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
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除快照
                          </button>
                        )}
                      </div>
                    </div>
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

            <div className="space-y-3">
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
