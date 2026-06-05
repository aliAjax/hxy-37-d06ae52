import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, BookMarked, ScanLine, Calendar, Users, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Material, MaterialType, MaterialTypeLabels, ScanStatus, ScanStatusLabels, SearchFilters } from '../types';
import { MaterialCard } from '../components/MaterialCard';
import { Modal } from '../components/Modal';
import { MaterialForm } from '../components/MaterialForm';
import { MaterialDetail } from '../components/MaterialDetail';

export function MaterialList() {
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const searchMaterials = useStore((state) => state.searchMaterials);
  const addMaterial = useStore((state) => state.addMaterial);
  const updateMaterial = useStore((state) => state.updateMaterial);
  const deleteMaterial = useStore((state) => state.deleteMaterial);

  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const typeOptions = Object.entries(MaterialTypeLabels) as [MaterialType, string][];
  const scanStatusOptions = Object.entries(ScanStatusLabels) as [ScanStatus, string][];

  const filteredMaterials = searchMaterials(filters);

  const availableWorks = useMemo(() => {
    const works = new Set<string>();
    filteredMaterials.forEach((m) => {
      if (m.work) works.add(m.work);
    });
    if (filters.work) works.add(filters.work);
    return Array.from(works).sort();
  }, [filteredMaterials, filters.work]);

  const availableTypes = useMemo(() => {
    const types = new Set<MaterialType>();
    filteredMaterials.forEach((m) => types.add(m.type));
    if (filters.type) types.add(filters.type);
    return typeOptions.filter(([value]) => types.has(value));
  }, [filteredMaterials, filters.type, typeOptions]);

  const availableScanStatuses = useMemo(() => {
    const statuses = new Set<ScanStatus>();
    filteredMaterials.forEach((m) => statuses.add(m.scanStatus));
    if (filters.scanStatus) statuses.add(filters.scanStatus);
    return scanStatusOptions.filter(([value]) => statuses.has(value));
  }, [filteredMaterials, filters.scanStatus, scanStatusOptions]);

  const availablePublishYears = useMemo(() => {
    const years = new Set<number>();
    filteredMaterials.forEach((m) => {
      if (m.publishDate) {
        const year = parseInt(m.publishDate.split('-')[0]);
        if (!isNaN(year)) years.add(year);
      }
    });
    if (filters.yearFrom) years.add(filters.yearFrom);
    if (filters.yearTo) years.add(filters.yearTo);
    return Array.from(years).sort((a, b) => a - b);
  }, [filteredMaterials, filters.yearFrom, filters.yearTo]);

  const minAvailableYear = availablePublishYears.length > 0 ? availablePublishYears[0] : undefined;
  const maxAvailableYear = availablePublishYears.length > 0 ? availablePublishYears[availablePublishYears.length - 1] : undefined;

  const availableCharacters = useMemo(() => {
    const charIds = new Set<string>();
    filteredMaterials.forEach((m) => {
      m.characterIds.forEach((id) => charIds.add(id));
    });
    if (filters.characterId) charIds.add(filters.characterId);
    return characters.filter((c) => charIds.has(c.id));
  }, [filteredMaterials, filters.characterId, characters]);

  const availableStaff = useMemo(() => {
    const staffIds = new Set<string>();
    filteredMaterials.forEach((m) => {
      m.staffIds.forEach((id) => staffIds.add(id));
    });
    if (filters.staffId) staffIds.add(filters.staffId);
    return staff.filter((s) => staffIds.has(s.id));
  }, [filteredMaterials, filters.staffId, staff]);

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof SearchFilters] !== undefined
  );

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = (id: string) => {
    deleteMaterial(id);
    setDeleteConfirm(null);
  };

  const handleSubmit = (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingMaterial) {
      updateMaterial(editingMaterial.id, data);
    } else {
      addMaterial(data);
    }
    setShowAddModal(false);
    setEditingMaterial(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            资料管理
          </h1>
          <p className="text-gray-400">
            共 {filteredMaterials.length} 条资料记录
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMaterial(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg btn-primary text-primary-900 font-medium"
        >
          <Plus className="w-5 h-5" />
          添加资料
        </button>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={filters.keyword || ''}
              onChange={(e) => updateFilter('keyword', e.target.value || undefined)}
              placeholder="搜索标题、作品、出版社、描述..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <BookMarked className="w-3.5 h-3.5" />
                作品
              </label>
              <select
                value={filters.work || ''}
                onChange={(e) => updateFilter('work', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus text-sm"
              >
                <option value="">全部作品</option>
                {availableWorks.map((work) => (
                  <option key={work} value={work}>
                    {work}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <ScanLine className="w-3.5 h-3.5" />
                扫描状态
              </label>
              <select
                value={filters.scanStatus || ''}
                onChange={(e) => updateFilter('scanStatus', (e.target.value as ScanStatus) || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus text-sm"
              >
                <option value="">全部状态</option>
                {availableScanStatuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                资料类型
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => updateFilter('type', (e.target.value as MaterialType) || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus text-sm"
              >
                <option value="">全部类型</option>
                {availableTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                起始年份
              </label>
              <input
                type="number"
                value={filters.yearFrom || ''}
                onChange={(e) => updateFilter('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={minAvailableYear ? `最早 ${minAvailableYear}` : '年份'}
                min={minAvailableYear}
                max={maxAvailableYear}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                结束年份
              </label>
              <input
                type="number"
                value={filters.yearTo || ''}
                onChange={(e) => updateFilter('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={maxAvailableYear ? `最晚 ${maxAvailableYear}` : '年份'}
                min={minAvailableYear}
                max={maxAvailableYear}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Users className="w-3.5 h-3.5" />
                关联角色
              </label>
              <select
                value={filters.characterId || ''}
                onChange={(e) => updateFilter('characterId', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus text-sm"
              >
                <option value="">全部角色</option>
                {availableCharacters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <User className="w-3.5 h-3.5" />
                关联制作人员
              </label>
              <select
                value={filters.staffId || ''}
                onChange={(e) => updateFilter('staffId', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus text-sm"
              >
                <option value="">全部人员</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-accent-500/10">
              <span className="text-sm text-gray-400">
                已应用筛选条件，显示 {filteredMaterials.length} / {materials.length} 条资料
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
              >
                清除所有筛选
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={(m) => {
                setEditingMaterial(m);
                setShowAddModal(true);
              }}
              onDelete={(id) => setDeleteConfirm(id)}
              onView={(m) => setViewingMaterial(m)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {materials.length === 0 ? '暂无资料' : '未找到匹配的资料'}
          </h3>
          <p className="text-gray-400">
            {materials.length === 0
              ? '点击上方按钮添加您的第一份资料'
              : hasActiveFilters
              ? '尝试调整或清除筛选条件后查看'
              : '尝试调整搜索条件'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 border border-accent-500/30 transition-colors text-sm"
            >
              清除筛选条件
            </button>
          )}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? '编辑资料' : '添加资料'}
        size="xl"
      >
        <MaterialForm
          initialData={editingMaterial || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowAddModal(false);
            setEditingMaterial(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingMaterial}
        onClose={() => setViewingMaterial(null)}
        title="资料详情"
        size="lg"
      >
        {viewingMaterial && <MaterialDetail material={viewingMaterial} />}
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white mb-2">确定要删除这份资料吗？</p>
          <p className="text-gray-400 text-sm mb-6">此操作无法撤销</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-6 py-2 rounded-lg btn-secondary text-white font-medium"
            >
              取消
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
