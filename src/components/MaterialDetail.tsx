import { useState } from 'react';
import { Material, MaterialTypeLabels, ScanStatusLabels, PageReference } from '../types';
import { useStore } from '../store/useStore';
import { Calendar, BookMarked, Building2, ShoppingBag, FileText, Users, User, Hash, Plus, Edit2, Trash2 } from 'lucide-react';
import { TagSelector } from './TagSelector';
import { FormInput, FormTextarea } from './FormInput';
import { Modal } from './Modal';

interface MaterialDetailProps {
  material: Material;
  onMaterialChange?: () => void;
}

export function MaterialDetail({ material, onMaterialChange }: MaterialDetailProps) {
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const updateMaterial = useStore((state) => state.updateMaterial);

  const [editingRef, setEditingRef] = useState<PageReference | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const materialCharacters = material.characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  const materialStaff = material.staffIds
    .map((id) => staff.find((s) => s.id === id))
    .filter(Boolean);

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

  const scanStatusColors = {
    unscanned: 'bg-gray-500/20 text-gray-400',
    partial: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
  };

  const typeIcons = {
    artbook: '🎨',
    storyboard: '📝',
    setting: '📋',
    magazine: '📰',
    special: '✨',
  };

  const handleAddReference = () => {
    const newRef: PageReference = {
      id: Date.now().toString(),
      pageNumber: material.pageStart,
      description: '',
      characterIds: [],
      staffIds: [],
    };
    setEditingRef(newRef);
    setIsAdding(true);
  };

  const handleEditReference = (ref: PageReference) => {
    setEditingRef({ ...ref });
    setIsAdding(false);
  };

  const handleSaveReference = () => {
    if (!editingRef) return;

    const pageNum = editingRef.pageNumber;
    if (pageNum < material.pageStart || pageNum > material.pageEnd) {
      return;
    }

    const existingIndex = material.pageReferences.findIndex((r) => r.id === editingRef.id);
    let newPageReferences: PageReference[];

    if (existingIndex >= 0) {
      newPageReferences = [...material.pageReferences];
      newPageReferences[existingIndex] = editingRef;
    } else {
      newPageReferences = [...material.pageReferences, editingRef];
    }

    newPageReferences.sort((a, b) => a.pageNumber - b.pageNumber);

    updateMaterial(material.id, { pageReferences: newPageReferences });
    setEditingRef(null);
    setIsAdding(false);
    onMaterialChange?.();
  };

  const handleDeleteReference = () => {
    if (!deleteConfirm) return;

    const newPageReferences = material.pageReferences.filter((r) => r.id !== deleteConfirm);
    updateMaterial(material.id, { pageReferences: newPageReferences });
    setDeleteConfirm(null);
    onMaterialChange?.();
  };

  const isPageNumberValid = editingRef
    ? editingRef.pageNumber >= material.pageStart && editingRef.pageNumber <= material.pageEnd
    : true;

  const sortedReferences = [...material.pageReferences].sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="text-5xl">{typeIcons[material.type]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-serif text-2xl font-bold text-white">
              {material.title}
            </h2>
            <span className="px-3 py-1 text-sm rounded-full bg-accent-500/20 text-accent-400">
              {MaterialTypeLabels[material.type]}
            </span>
            <span className={`px-3 py-1 text-sm rounded-full ${scanStatusColors[material.scanStatus]}`}>
              {ScanStatusLabels[material.scanStatus]}
            </span>
          </div>
          {material.work && (
            <div className="flex items-center gap-2 text-gray-400">
              <BookMarked className="w-4 h-4" />
              <span>{material.work}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {material.publisher && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Building2 className="w-4 h-4" />
              出版社
            </div>
            <div className="text-white font-medium">{material.publisher}</div>
          </div>
        )}

        {material.publishDate && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              出版日期
            </div>
            <div className="text-white font-medium">{material.publishDate}</div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            页数
          </div>
          <div className="text-white font-medium">
            {material.pageCount} 页
            {(material.pageStart > 1 || material.pageEnd < material.pageCount) && (
              <span className="text-accent-400 ml-2">
                (P{material.pageStart} - P{material.pageEnd})
              </span>
            )}
          </div>
        </div>

        {material.purchaseSource && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <ShoppingBag className="w-4 h-4" />
              购买来源
            </div>
            <div className="text-white font-medium">{material.purchaseSource}</div>
          </div>
        )}
      </div>

      {material.description && (
        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="text-gray-400 text-sm mb-2">收录内容</div>
          <div className="text-white leading-relaxed">{material.description}</div>
        </div>
      )}

      {materialCharacters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Users className="w-4 h-4" />
            关联角色 ({materialCharacters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {materialCharacters.map((char) => (
              <span
                key={char!.id}
                className="px-3 py-2 rounded-lg bg-primary-700/50 text-white text-sm"
              >
                {char!.name}
                {char!.work && (
                  <span className="text-gray-400 ml-2">({char!.work})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {materialStaff.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <User className="w-4 h-4" />
            制作人员 ({materialStaff.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {materialStaff.map((s) => (
              <span
                key={s!.id}
                className="px-3 py-2 rounded-lg bg-primary-700/50 text-white text-sm"
              >
                {s!.name}
                {s!.role && (
                  <span className="text-accent-400 ml-2">({s!.role})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Hash className="w-4 h-4" />
            页码标注 ({sortedReferences.length})
          </div>
          <button
            onClick={handleAddReference}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 text-sm hover:bg-accent-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加标注
          </button>
        </div>
        {sortedReferences.length > 0 ? (
          <div className="space-y-3">
            {sortedReferences.map((ref) => {
              const refChars = ref.characterIds
                .map((id) => characters.find((c) => c.id === id)?.name)
                .filter(Boolean);
              const refStaff = ref.staffIds
                .map((id) => staff.find((s) => s.id === id)?.name)
                .filter(Boolean);

              return (
                <div
                  key={ref.id}
                  className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/10"
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
                      {(refChars.length > 0 || refStaff.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {refChars.map((name) => (
                            <span
                              key={name}
                              className="px-2 py-1 rounded bg-primary-700/50 text-gray-300 text-xs"
                            >
                              {name}
                            </span>
                          ))}
                          {refStaff.map((name) => (
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditReference(ref)}
                        className="p-2 rounded-lg hover:bg-primary-700/50 text-gray-400 hover:text-white transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ref.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="删除"
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
          <div className="p-8 text-center rounded-lg bg-primary-800/20 border border-accent-500/10">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-700/50 flex items-center justify-center">
              <Hash className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-4">暂无页码标注</p>
            <button
              onClick={handleAddReference}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 text-sm hover:bg-accent-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加第一条页码标注
            </button>
          </div>
        )}
      </div>

      {material.copyrightNote && (
        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="text-gray-400 text-sm mb-2">版权备注</div>
          <div className="text-gray-300 text-sm">{material.copyrightNote}</div>
        </div>
      )}

      <div className="text-xs text-gray-600 pt-4 border-t border-accent-500/10">
        <div>创建时间: {new Date(material.createdAt).toLocaleString('zh-CN')}</div>
        <div>更新时间: {new Date(material.updatedAt).toLocaleString('zh-CN')}</div>
      </div>

      <Modal
        isOpen={!!editingRef}
        onClose={() => {
          setEditingRef(null);
          setIsAdding(false);
        }}
        title={isAdding ? '新增页码标注' : '编辑页码标注'}
        size="lg"
      >
        {editingRef && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="页码"
                type="number"
                value={editingRef.pageNumber}
                onChange={(e) =>
                  setEditingRef({
                    ...editingRef,
                    pageNumber: parseInt(e.target.value) || material.pageStart,
                  })
                }
                error={
                  !isPageNumberValid
                    ? `页码必须在 ${material.pageStart} - ${material.pageEnd} 之间`
                    : undefined
                }
              />
              <div className="flex items-end">
                <span className="text-sm text-gray-400">
                  有效范围：P.{material.pageStart} - P.{material.pageEnd}
                </span>
              </div>
            </div>

            <FormTextarea
              label="描述"
              value={editingRef.description}
              onChange={(e) =>
                setEditingRef({
                  ...editingRef,
                  description: e.target.value,
                })
              }
              placeholder="该页内容描述"
            />

            <div className="grid grid-cols-2 gap-4">
              <TagSelector
                label="关联角色"
                availableTags={characterTags}
                selectedIds={editingRef.characterIds}
                onChange={(ids) =>
                  setEditingRef({
                    ...editingRef,
                    characterIds: ids,
                  })
                }
                placeholder="搜索角色..."
              />

              <TagSelector
                label="关联制作人员"
                availableTags={staffTags}
                selectedIds={editingRef.staffIds}
                onChange={(ids) =>
                  setEditingRef({
                    ...editingRef,
                    staffIds: ids,
                  })
                }
                placeholder="搜索制作人员..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
              <button
                type="button"
                onClick={() => {
                  setEditingRef(null);
                  setIsAdding(false);
                }}
                className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveReference}
                disabled={!isPageNumberValid}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isPageNumberValid
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
    </div>
  );
}
