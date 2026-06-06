import { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Calendar,
  Clock,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  Material,
  ScanStatus,
  ScanStatusLabels,
  MaterialType,
  MaterialTypeLabels,
  ScanPriority,
  ScanPriorityLabels,
  ScanTask,
} from '../types';
import { Modal } from '../components/Modal';

interface TaskWithMaterial {
  material: Material;
  task?: ScanTask;
}

export function ScanTasks() {
  const materials = useStore((state) => state.materials);
  const scanTasks = useStore((state) => state.scanTasks);
  const setScanTask = useStore((state) => state.setScanTask);
  const deleteScanTask = useStore((state) => state.deleteScanTask);
  const batchSetScanTasks = useStore((state) => state.batchSetScanTasks);

  const [statusFilter, setStatusFilter] = useState<ScanStatus | ''>('');
  const [workFilter, setWorkFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ScanPriority | ''>('');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'title'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    priority: 'medium' as ScanPriority,
    plannedDate: '',
    notes: '',
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    priority: 'medium' as ScanPriority,
    plannedDate: '',
    notes: '',
  });

  const works = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.work))).filter(Boolean).sort();
  }, [materials]);

  const pendingMaterials = useMemo(() => {
    return materials.filter((m) => m.scanStatus !== 'completed');
  }, [materials]);

  const tasksWithMaterials = useMemo<TaskWithMaterial[]>(() => {
    return pendingMaterials.map((material) => ({
      material,
      task: scanTasks[material.id],
    }));
  }, [pendingMaterials, scanTasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasksWithMaterials];

    if (statusFilter) {
      result = result.filter((t) => t.material.scanStatus === statusFilter);
    }
    if (workFilter) {
      result = result.filter((t) => t.material.work === workFilter);
    }
    if (typeFilter) {
      result = result.filter((t) => t.material.type === typeFilter);
    }
    if (priorityFilter) {
      result = result.filter((t) => t.task?.priority === priorityFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = a.task?.priority ? priorityOrder[a.task.priority] : 0;
        const bPriority = b.task?.priority ? priorityOrder[b.task.priority] : 0;
        comparison = aPriority - bPriority;
      } else if (sortBy === 'date') {
        const aDate = a.task?.plannedDate || '';
        const bDate = b.task?.plannedDate || '';
        comparison = aDate.localeCompare(bDate);
      } else if (sortBy === 'title') {
        comparison = a.material.title.localeCompare(b.material.title);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [tasksWithMaterials, statusFilter, workFilter, typeFilter, priorityFilter, sortBy, sortOrder]);

  const selectedTasks = useMemo(
    () => filteredTasks.filter((t) => selectedIds.has(t.material.id)),
    [filteredTasks, selectedIds]
  );

  const selectedWithTask = useMemo(
    () => selectedTasks.filter((t) => t.task).length,
    [selectedTasks]
  );

  const selectedWithoutTask = useMemo(
    () => selectedTasks.filter((t) => !t.task).length,
    [selectedTasks]
  );

  useEffect(() => {
    const visibleIds = new Set(filteredTasks.map((t) => t.material.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let hasChange = false;
      next.forEach((id) => {
        if (!visibleIds.has(id)) {
          next.delete(id);
          hasChange = true;
        }
      });
      return hasChange ? next : prev;
    });
  }, [filteredTasks]);

  const allSelected = filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.material.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openBatchModal = () => {
    if (selectedTasks.length === 0) return;

    const tasks = selectedTasks.filter((t) => t.task).map((t) => t.task!);
    
    let initialPriority: ScanPriority = 'medium';
    let initialDate = '';
    let initialNotes = '';

    if (tasks.length > 0) {
      const firstPriority = tasks[0].priority;
      const allSamePriority = tasks.every((t) => t.priority === firstPriority);
      if (allSamePriority) {
        initialPriority = firstPriority;
      }

      const firstDate = tasks[0].plannedDate;
      const allSameDate = tasks.every((t) => t.plannedDate === firstDate);
      if (allSameDate) {
        initialDate = firstDate || '';
      }

      const firstNotes = tasks[0].notes;
      const allSameNotes = tasks.every((t) => t.notes === firstNotes);
      if (allSameNotes) {
        initialNotes = firstNotes || '';
      }
    }

    setBatchForm({
      priority: initialPriority,
      plannedDate: initialDate,
      notes: initialNotes,
    });
    setBatchModalOpen(true);
  };

  const handleBatchPreview = () => {
    setBatchModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleBatchConfirm = () => {
    const ids = selectedTasks.map((t) => t.material.id);
    batchSetScanTasks(ids, batchForm);
    setSelectedIds(new Set());
    setConfirmModalOpen(false);
  };

  const handleEdit = (item: TaskWithMaterial) => {
    setEditingId(item.material.id);
    setEditForm({
      priority: item.task?.priority || 'medium',
      plannedDate: item.task?.plannedDate || '',
      notes: item.task?.notes || '',
    });
  };

  const handleSave = (materialId: string) => {
    setScanTask(materialId, {
      priority: editForm.priority,
      plannedDate: editForm.plannedDate,
      notes: editForm.notes,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleClearTask = (materialId: string) => {
    deleteScanTask(materialId);
  };

  const getPriorityColor = (priority?: ScanPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: ScanStatus) => {
    switch (status) {
      case 'unscanned':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'partial':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const stats = useMemo(() => {
    const total = pendingMaterials.length;
    const withTask = tasksWithMaterials.filter((t) => t.task).length;
    const urgent = tasksWithMaterials.filter((t) => t.task?.priority === 'urgent').length;
    return { total, withTask, urgent };
  }, [pendingMaterials, tasksWithMaterials]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
          扫描任务
        </h1>
        <p className="text-gray-400">
          管理待扫描资料的优先级和计划
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">待扫描资料</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">已规划任务</p>
              <p className="text-2xl font-bold text-white">{stats.withTask}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">紧急优先级</p>
              <p className="text-2xl font-bold text-white">{stats.urgent}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-accent-500/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-400 text-sm">筛选：</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ScanStatus | '')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部状态</option>
              {(Object.entries(ScanStatusLabels) as [ScanStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={workFilter}
              onChange={(e) => setWorkFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部作品</option>
              {works.map((work) => (
                <option key={work} value={work}>
                  {work}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MaterialType | '')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部类型</option>
              {(Object.entries(MaterialTypeLabels) as [MaterialType, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as ScanPriority | '')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部优先级</option>
              {(Object.entries(ScanPriorityLabels) as [ScanPriority, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'title')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="priority">优先级</option>
              <option value="date">计划日期</option>
              <option value="title">标题</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-gray-400 hover:text-white transition-colors"
            >
              {sortOrder === 'desc' ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <>
          <div className="glass rounded-xl p-4 border border-accent-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  全选
                </button>
                <span className="text-sm text-gray-400">
                  已选中 <span className="text-accent-400 font-medium">{selectedTasks.length}</span> / {filteredTasks.length} 条
                </span>
              </div>
              <div className="flex gap-3">
                {selectedTasks.length > 0 && (
                  <span className="text-sm text-gray-400 flex items-center">
                    其中已规划 <span className="text-blue-400 font-medium">{selectedWithTask}</span> 条，未规划 <span className="text-yellow-400 font-medium">{selectedWithoutTask}</span> 条
                  </span>
                )}
                <button
                  onClick={openBatchModal}
                  disabled={selectedTasks.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg btn-primary text-primary-900 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  批量规划 ({selectedTasks.length})
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredTasks.map(({ material, task }) => (
              <div
                key={material.id}
                className={`glass rounded-xl p-5 border hover:border-accent-500/40 transition-colors ${
                  selectedIds.has(material.id)
                    ? 'border-accent-500/50 bg-accent-500/5'
                    : 'border-accent-500/20'
                }`}
              >
                {editingId === material.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">优先级</label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as ScanPriority })}
                          className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                        >
                          {(Object.entries(ScanPriorityLabels) as [ScanPriority, string][]).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">计划日期</label>
                        <input
                          type="date"
                          value={editForm.plannedDate}
                          onChange={(e) => setEditForm({ ...editForm, plannedDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">备注</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="添加扫描任务备注..."
                        className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus resize-none h-20"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg btn-secondary text-white text-sm"
                      >
                        <X className="w-4 h-4" />
                        取消
                      </button>
                      <button
                        onClick={() => handleSave(material.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-primary-900 text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <button
                      onClick={() => toggleSelect(material.id)}
                      className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      {selectedIds.has(material.id) ? (
                        <CheckSquare className="w-5 h-5 text-accent-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {material.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(material.scanStatus)}`}>
                          {ScanStatusLabels[material.scanStatus]}
                        </span>
                        {task?.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(task.priority)}`}>
                            {ScanPriorityLabels[task.priority]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span>{material.work}</span>
                        <span>{MaterialTypeLabels[material.type]}</span>
                        <span>{material.publisher}</span>
                        <span>{material.pageCount} 页</span>
                      </div>
                      {task?.plannedDate && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>计划日期：{task.plannedDate}</span>
                        </div>
                      )}
                      {task?.notes && (
                        <p className="mt-2 text-sm text-gray-400 bg-primary-800/30 rounded-lg p-3">
                          {task.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task && (
                        <button
                          onClick={() => handleClearTask(material.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="清除任务"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit({ material, task })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg btn-secondary text-white text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        {task ? '编辑任务' : '添加任务'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {pendingMaterials.length === 0 ? '无待扫描资料' : '未找到匹配的任务'}
          </h3>
          <p className="text-gray-400">
            {pendingMaterials.length === 0
              ? '所有资料都已完成扫描！'
              : '尝试调整筛选条件'}
          </p>
        </div>
      )}

      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="批量规划任务"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
            <p className="text-sm text-gray-300">
              已选择 <span className="text-accent-400 font-medium">{selectedTasks.length}</span> 条资料。
              其中 <span className="text-blue-400 font-medium">{selectedWithTask}</span> 条已有任务将被覆盖，
              <span className="text-yellow-400 font-medium">{selectedWithoutTask}</span> 条将新建任务。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">优先级</label>
            <select
              value={batchForm.priority}
              onChange={(e) => setBatchForm({ ...batchForm, priority: e.target.value as ScanPriority })}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              {(Object.entries(ScanPriorityLabels) as [ScanPriority, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">计划日期</label>
            <input
              type="date"
              value={batchForm.plannedDate}
              onChange={(e) => setBatchForm({ ...batchForm, plannedDate: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">备注</label>
            <textarea
              value={batchForm.notes}
              onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
              placeholder="添加扫描任务备注..."
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus resize-none h-24"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
            <button
              onClick={() => setBatchModalOpen(false)}
              className="px-6 py-2 rounded-lg btn-secondary text-white font-medium"
            >
              取消
            </button>
            <button
              onClick={handleBatchPreview}
              className="flex items-center gap-2 px-6 py-2 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              下一步：确认
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="确认批量规划"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-accent-400">批量设置内容</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <p className="text-xs text-gray-500 mb-1">优先级</p>
                <p className="text-white font-medium">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(batchForm.priority)}`}>
                    {ScanPriorityLabels[batchForm.priority]}
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <p className="text-xs text-gray-500 mb-1">计划日期</p>
                <p className="text-white font-medium">
                  {batchForm.plannedDate || '未设置'}
                </p>
              </div>
            </div>
            {batchForm.notes && (
              <div className="p-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <p className="text-xs text-gray-500 mb-1">备注</p>
                <p className="text-white text-sm">{batchForm.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">
              受影响资料 <span className="text-accent-400">({selectedTasks.length})</span>
            </h3>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-300 font-medium">
                    将覆盖 {selectedWithTask} 条已有任务
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-1">
                    这些资料之前已经设置过扫描任务，本次操作将覆盖它们的优先级、计划日期和备注。
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-300 font-medium">
                    将新建 {selectedWithoutTask} 条任务
                  </p>
                  <p className="text-xs text-blue-400/70 mt-1">
                    这些资料之前没有设置扫描任务，本次操作将为它们创建新的任务。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">资料列表</h3>
            <div className="max-h-64 overflow-y-auto glass rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-accent-500/20">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">标题</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">作品</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作类型</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTasks.map(({ material, task }) => (
                    <tr key={material.id} className="border-b border-accent-500/10">
                      <td className="px-4 py-2 text-white text-sm">{material.title}</td>
                      <td className="px-4 py-2 text-gray-300 text-sm">{material.work}</td>
                      <td className="px-4 py-2 text-sm">
                        {task ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            覆盖
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            新建
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
            <button
              onClick={() => {
                setConfirmModalOpen(false);
                setBatchModalOpen(true);
              }}
              className="px-6 py-2 rounded-lg btn-secondary text-white font-medium"
            >
              返回修改
            </button>
            <button
              onClick={handleBatchConfirm}
              className="flex items-center gap-2 px-6 py-2 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <CheckSquare className="w-4 h-4" />
              确认应用
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
