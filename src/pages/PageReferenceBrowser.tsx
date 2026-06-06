import { useState, useMemo } from 'react';
import { Hash, Plus, Edit2, Trash2, Search, Filter, X, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageReference, MaterialTypeLabels } from '../types';
import { TagSelector } from '../components/TagSelector';
import { FormInput, FormTextarea } from '../components/FormInput';
import { Modal } from '../components/Modal';
import { MaterialDetail } from '../components/MaterialDetail';

interface FilterState {
  work: string;
  characterId: string;
  staffId: string;
  pageMin: string;
  pageMax: string;
  keyword: string;
  showOnlyWithReferences: boolean;
}

interface EditingState {
  materialId: string;
  reference: PageReference | null;
}

export function PageReferenceBrowser() {
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const updateMaterial = useStore((state) => state.updateMaterial);

  const [filters, setFilters] = useState<FilterState>({
    work: '',
    characterId: '',
    staffId: '',
    pageMin: '',
    pageMax: '',
    keyword: '',
    showOnlyWithReferences: false,
  });

  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ materialId: string; refId: string } | null>(null);
  const [viewingMaterialId, setViewingMaterialId] = useState<string | null>(null);

  const viewingMaterial = useStore((state) =>
    viewingMaterialId ? state.materials.find((m) => m.id === viewingMaterialId) || null : null
  );

  const works = useMemo(() => {
    const workSet = new Set(materials.map((m) => m.work));
    return Array.from(workSet).filter(Boolean).sort();
  }, [materials]);

  const characterTags = characters.map((c) => ({
    id: c.id,
    name: c.name,
    secondary: c.work,
  }));

  const staffTags = staff.map((s) => ({
    id: s.id,
    name: s.name,
    secondary: s.role,
  }));

  const hasReferenceFilters =
    filters.characterId ||
    filters.staffId ||
    filters.pageMin ||
    filters.pageMax ||
    filters.keyword;

  const filteredMaterials = useMemo(() => {
    const filterRefs = (refs: PageReference[]) => {
      return refs.filter((ref) => {
        if (filters.characterId && !ref.characterIds.includes(filters.characterId)) return false;
        if (filters.staffId && !ref.staffIds.includes(filters.staffId)) return false;

        const pageMin = filters.pageMin ? parseInt(filters.pageMin) : null;
        const pageMax = filters.pageMax ? parseInt(filters.pageMax) : null;
        if (pageMin !== null && ref.pageNumber < pageMin) return false;
        if (pageMax !== null && ref.pageNumber > pageMax) return false;

        if (filters.keyword) {
          const keyword = filters.keyword.toLowerCase();
          const descMatch = ref.description.toLowerCase().includes(keyword);
          const charMatch = ref.characterIds.some((id) =>
            characters.find((c) => c.id === id)?.name.toLowerCase().includes(keyword)
          );
          const staffMatch = ref.staffIds.some((id) =>
            staff.find((s) => s.id === id)?.name.toLowerCase().includes(keyword)
          );
          if (!descMatch && !charMatch && !staffMatch) return false;
        }

        return true;
      });
    };

    return materials
      .filter((material) => {
        if (filters.work && material.work !== filters.work) return false;

        const matchingRefs = filterRefs(material.pageReferences);

        if (filters.showOnlyWithReferences || hasReferenceFilters) {
          return matchingRefs.length > 0;
        }

        return true;
      })
      .map((material) => {
        const matchingRefs = filterRefs(material.pageReferences);
        return { ...material, matchingRefs };
      });
  }, [materials, filters, characters, staff, hasReferenceFilters]);

  const totalReferences = useMemo(() => {
    return filteredMaterials.reduce((sum, m) => sum + m.matchingRefs.length, 0);
  }, [filteredMaterials]);

  const toggleExpand = (materialId: string) => {
    const newExpanded = new Set(expandedMaterials);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedMaterials(newExpanded);
  };

  const getCharacterNames = (ids: string[]) =>
    ids.map((id) => characters.find((c) => c.id === id)?.name).filter(Boolean);

  const getStaffNames = (ids: string[]) =>
    ids.map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean);

  const getEditingMaterial = () => {
    if (!editing) return null;
    return materials.find((m) => m.id === editing.materialId) || null;
  };

  const isPageNumberValid = () => {
    const material = getEditingMaterial();
    if (!material || !editing?.reference) return true;
    const pageNum = editing.reference.pageNumber;
    return pageNum >= material.pageStart && pageNum <= material.pageEnd;
  };

  const handleAddReference = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    const newRef: PageReference = {
      id: Date.now().toString(),
      pageNumber: material?.pageStart || 1,
      description: '',
      characterIds: [],
      staffIds: [],
    };
    setEditing({ materialId, reference: newRef });
  };

  const handleEditReference = (materialId: string, ref: PageReference) => {
    setEditing({ materialId, reference: { ...ref } });
  };

  const handleSaveReference = () => {
    if (!editing || !editing.reference) return;

    const material = materials.find((m) => m.id === editing.materialId);
    if (!material) return;

    if (!isPageNumberValid()) return;

    const existingIndex = material.pageReferences.findIndex((r) => r.id === editing.reference!.id);
    let newPageReferences: PageReference[];

    if (existingIndex >= 0) {
      newPageReferences = [...material.pageReferences];
      newPageReferences[existingIndex] = editing.reference;
    } else {
      newPageReferences = [...material.pageReferences, editing.reference];
    }

    newPageReferences.sort((a, b) => a.pageNumber - b.pageNumber);

    updateMaterial(editing.materialId, { pageReferences: newPageReferences });
    setEditing(null);
  };

  const handleDeleteReference = () => {
    if (!deleteConfirm) return;

    const material = materials.find((m) => m.id === deleteConfirm.materialId);
    if (!material) return;

    const newPageReferences = material.pageReferences.filter((r) => r.id !== deleteConfirm.refId);
    updateMaterial(deleteConfirm.materialId, { pageReferences: newPageReferences });
    setDeleteConfirm(null);
  };

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      work: '',
      characterId: '',
      staffId: '',
      pageMin: '',
      pageMax: '',
      keyword: '',
      showOnlyWithReferences: false,
    });
  };

  const hasActiveFilters =
    filters.work ||
    filters.characterId ||
    filters.staffId ||
    filters.pageMin ||
    filters.pageMax ||
    filters.keyword ||
    filters.showOnlyWithReferences;

  const typeIcons: Record<string, string> = {
    artbook: '🎨',
    storyboard: '📝',
    setting: '📋',
    magazine: '📰',
    special: '✨',
  };

  const editingMaterial = getEditingMaterial();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            页码标注浏览器
          </h1>
          <p className="text-gray-400">
            共 {filteredMaterials.length} 份资料，{totalReferences} 条页码标注
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-primary-800/30 border border-accent-500/20 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-white">筛选条件</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              清除筛选
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">所属作品</label>
            <select
              value={filters.work}
              onChange={(e) => handleFilterChange('work', e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部作品</option>
              {works.map((work) => (
                <option key={work} value={work}>
                  {work}
                </option>
              ))}
            </select>
          </div>

          <TagSelector
            label="关联角色"
            availableTags={characterTags}
            selectedIds={filters.characterId ? [filters.characterId] : []}
            onChange={(ids) => handleFilterChange('characterId', ids[0] || '')}
            placeholder="搜索角色..."
          />

          <TagSelector
            label="关联制作人员"
            availableTags={staffTags}
            selectedIds={filters.staffId ? [filters.staffId] : []}
            onChange={(ids) => handleFilterChange('staffId', ids[0] || '')}
            placeholder="搜索制作人员..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">页码范围（最小）</label>
            <input
              type="number"
              value={filters.pageMin}
              onChange={(e) => handleFilterChange('pageMin', e.target.value)}
              placeholder="起始页码"
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">页码范围（最大）</label>
            <input
              type="number"
              value={filters.pageMax}
              onChange={(e) => handleFilterChange('pageMax', e.target.value)}
              placeholder="结束页码"
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">关键词</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                placeholder="描述、角色名、制作人员名"
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
              />
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  filters.showOnlyWithReferences
                    ? 'bg-accent-500'
                    : 'bg-primary-700'
                }`}
                onClick={() =>
                  handleFilterChange('showOnlyWithReferences', !filters.showOnlyWithReferences)
                }
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    filters.showOnlyWithReferences ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-300">只显示有标注的资料</span>
            </label>
          </div>
        </div>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="space-y-4">
          {filteredMaterials.map((material) => {
            const isExpanded = expandedMaterials.has(material.id);

            return (
              <div
                key={material.id}
                className="rounded-xl bg-primary-800/30 border border-accent-500/20 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary-800/50 transition-colors"
                  onClick={() => toggleExpand(material.id)}
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-3xl">{typeIcons[material.type]}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{material.title}</h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400">
                          {MaterialTypeLabels[material.type]}
                        </span>
                      </div>
                      {material.work && (
                        <div className="text-sm text-gray-400">{material.work}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingMaterialId(material.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-700/50 text-gray-300 text-sm hover:bg-primary-700 hover:text-white transition-colors"
                      title="查看资料详情"
                    >
                      <BookOpen className="w-4 h-4" />
                      查看资料
                    </button>
                    <span className="px-3 py-1 rounded-full bg-primary-700/50 text-gray-300 text-sm">
                      {material.matchingRefs.length} 条标注
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddReference(material.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 text-sm hover:bg-accent-500/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-accent-500/10">
                    {material.matchingRefs.length > 0 ? (
                      <div className="divide-y divide-accent-500/10">
                        {material.matchingRefs.map((ref) => {
                          const charNames = getCharacterNames(ref.characterIds);
                          const staffNames = getStaffNames(ref.staffIds);

                          return (
                            <div
                              key={ref.id}
                              className="p-4 hover:bg-primary-800/30 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-400 text-sm font-medium">
                                      P.{ref.pageNumber}
                                    </span>
                                    {ref.description && (
                                      <span className="text-white">{ref.description}</span>
                                    )}
                                  </div>
                                  {(charNames.length > 0 || staffNames.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {charNames.map((name) => (
                                        <span
                                          key={name}
                                          className="px-2 py-1 rounded bg-primary-700/50 text-gray-300 text-xs"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                      {staffNames.map((name) => (
                                        <span
                                          key={name}
                                          className="px-2 py-1 rounded bg-primary-700/50 text-gray-300 text-xs"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditReference(material.id, ref)}
                                    className="p-2 rounded-lg hover:bg-primary-700/50 text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirm({ materialId: material.id, refId: ref.id })
                                    }
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-700/50 flex items-center justify-center">
                          <Hash className="w-6 h-6 text-gray-500" />
                        </div>
                        <p className="text-gray-400 mb-4">暂无页码标注</p>
                        <button
                          onClick={() => handleAddReference(material.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 text-sm hover:bg-accent-500/30 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          添加第一条页码标注
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
            <Hash className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            未找到匹配的页码标注
          </h3>

          <p className="text-gray-400">
            尝试调整筛选条件
          </p>
        </div>
      )}

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.reference?.description
          ? '编辑页码标注'
          : '新增页码标注'}
        size="lg"
      >
        {editing && editing.reference && editingMaterial && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="页码"
                type="number"
                value={editing.reference.pageNumber}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    reference: {
                      ...editing.reference!,
                      pageNumber: parseInt(e.target.value) || editingMaterial.pageStart,
                    },
                  })
                }
                error={
                  !isPageNumberValid()
                    ? `页码必须在 ${editingMaterial.pageStart} - ${editingMaterial.pageEnd} 之间`
                    : undefined
                }
              />
              <div className="flex items-end">
                <span className="text-sm text-gray-400">
                  有效范围：P.{editingMaterial.pageStart} - P.{editingMaterial.pageEnd}
                </span>
              </div>
            </div>

            <FormTextarea
              label="描述"
              value={editing.reference.description}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  reference: {
                    ...editing.reference!,
                    description: e.target.value,
                  },
                })
              }
              placeholder="该页内容描述"
            />

            <div className="grid grid-cols-2 gap-4">
              <TagSelector
                label="关联角色"
                availableTags={characterTags}
                selectedIds={editing.reference.characterIds}
                onChange={(ids) =>
                  setEditing({
                    ...editing,
                    reference: {
                      ...editing.reference!,
                      characterIds: ids,
                    },
                  })
                }
                placeholder="搜索角色..."
              />

              <TagSelector
                label="关联制作人员"
                availableTags={staffTags}
                selectedIds={editing.reference.staffIds}
                onChange={(ids) =>
                  setEditing({
                    ...editing,
                    reference: {
                      ...editing.reference!,
                      staffIds: ids,
                    },
                  })
                }
                placeholder="搜索制作人员..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveReference}
                disabled={!isPageNumberValid()}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isPageNumberValid()
                    ? 'btn-primary text-primary-900'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                保存
              </button>
            </div>
          </div>
        )}
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
          <p className="text-white mb-2">确定要删除这条页码标注吗？</p>
          <p className="text-gray-400 text-sm mb-6">此操作无法撤销</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-6 py-2 rounded-lg btn-secondary text-white font-medium"
            >
              取消
            </button>
            <button
              onClick={handleDeleteReference}
              className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingMaterial}
        onClose={() => setViewingMaterialId(null)}
        title="资料详情"
        size="lg"
      >
        {viewingMaterial && (
          <MaterialDetail
            material={viewingMaterial}
            onMaterialChange={() => {
            }}
          />
        )}
      </Modal>
    </div>
  );
}
