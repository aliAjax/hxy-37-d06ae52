import { useState } from 'react';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Material, MaterialType, MaterialTypeLabels } from '../types';
import { MaterialCard } from '../components/MaterialCard';
import { Modal } from '../components/Modal';
import { MaterialForm } from '../components/MaterialForm';
import { MaterialDetail } from '../components/MaterialDetail';

export function MaterialList() {
  const materials = useStore((state) => state.materials);
  const addMaterial = useStore((state) => state.addMaterial);
  const updateMaterial = useStore((state) => state.updateMaterial);
  const deleteMaterial = useStore((state) => state.deleteMaterial);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.work.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索资料标题或作品..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
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
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {materials.length === 0 ? '暂无资料' : '未找到匹配的资料'}
          </h3>
          <p className="text-gray-400">
            {materials.length === 0
              ? '点击上方按钮添加您的第一份资料'
              : '尝试调整搜索条件或筛选类型'}
          </p>
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
