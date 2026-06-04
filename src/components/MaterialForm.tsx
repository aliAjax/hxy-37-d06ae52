import { useState, useEffect } from 'react';
import { Material, MaterialType, ScanStatus, PageReference } from '../types';
import { useStore } from '../store/useStore';
import { FormInput, FormTextarea, FormSelect } from './FormInput';
import { TagSelector } from './TagSelector';
import { Plus, Trash2 } from 'lucide-react';

interface MaterialFormProps {
  initialData?: Material;
  onSubmit: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const typeOptions: { value: MaterialType; label: string }[] = [
  { value: 'artbook', label: '原画集' },
  { value: 'storyboard', label: '分镜集' },
  { value: 'setting', label: '设定集' },
  { value: 'magazine', label: '杂志切页' },
  { value: 'special', label: '特典册' },
];

const scanStatusOptions: { value: ScanStatus; label: string }[] = [
  { value: 'unscanned', label: '未扫描' },
  { value: 'partial', label: '部分扫描' },
  { value: 'completed', label: '已完成' },
];

export function MaterialForm({ initialData, onSubmit, onCancel }: MaterialFormProps) {
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const addCharacter = useStore((state) => state.addCharacter);
  const addStaff = useStore((state) => state.addStaff);

  const [formData, setFormData] = useState({
    title: '',
    type: 'artbook' as MaterialType,
    work: '',
    publisher: '',
    publishDate: '',
    pageCount: 0,
    purchaseSource: '',
    scanStatus: 'unscanned' as ScanStatus,
    copyrightNote: '',
    description: '',
    characterIds: [] as string[],
    staffIds: [] as string[],
    pageReferences: [] as PageReference[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        type: initialData.type,
        work: initialData.work,
        publisher: initialData.publisher,
        publishDate: initialData.publishDate,
        pageCount: initialData.pageCount,
        purchaseSource: initialData.purchaseSource,
        scanStatus: initialData.scanStatus,
        copyrightNote: initialData.copyrightNote,
        description: initialData.description,
        characterIds: initialData.characterIds,
        staffIds: initialData.staffIds,
        pageReferences: initialData.pageReferences,
      });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleAddPageReference = () => {
    const newRef: PageReference = {
      id: Date.now().toString(),
      pageNumber: 1,
      description: '',
      characterIds: [],
      staffIds: [],
    };
    setFormData({
      ...formData,
      pageReferences: [...formData.pageReferences, newRef],
    });
  };

  const handleUpdatePageReference = (index: number, updates: Partial<PageReference>) => {
    const newRefs = [...formData.pageReferences];
    newRefs[index] = { ...newRefs[index], ...updates };
    setFormData({ ...formData, pageReferences: newRefs });
  };

  const handleRemovePageReference = (index: number) => {
    const newRefs = formData.pageReferences.filter((_, i) => i !== index);
    setFormData({ ...formData, pageReferences: newRefs });
  };

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

  const handleAddCharacter = (name: string) => {
    addCharacter({ name, work: formData.work });
  };

  const handleAddStaff = (name: string) => {
    addStaff({ name, role: '其他', works: [formData.work] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="资料标题"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={errors.title}
          required
          placeholder="输入资料标题"
        />

        <FormSelect
          label="资料类型"
          options={typeOptions}
          value={formData.type}
          onChange={(v) => setFormData({ ...formData, type: v as MaterialType })}
        />

        <FormInput
          label="所属作品"
          value={formData.work}
          onChange={(e) => setFormData({ ...formData, work: e.target.value })}
          placeholder="输入作品名称"
        />

        <FormInput
          label="出版社"
          value={formData.publisher}
          onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
          placeholder="输入出版社名称"
        />

        <FormInput
          label="出版日期"
          type="date"
          value={formData.publishDate}
          onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
        />

        <FormInput
          label="总页数"
          type="number"
          value={formData.pageCount || ''}
          onChange={(e) => setFormData({ ...formData, pageCount: parseInt(e.target.value) || 0 })}
          placeholder="输入页码数量"
        />

        <FormInput
          label="购买来源"
          value={formData.purchaseSource}
          onChange={(e) => setFormData({ ...formData, purchaseSource: e.target.value })}
          placeholder="如：日亚、骏河屋、淘宝等"
        />

        <FormSelect
          label="扫描状态"
          options={scanStatusOptions}
          value={formData.scanStatus}
          onChange={(v) => setFormData({ ...formData, scanStatus: v as ScanStatus })}
        />
      </div>

      <FormTextarea
        label="收录内容描述"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="详细描述收录的内容"
      />

      <FormTextarea
        label="版权备注"
        value={formData.copyrightNote}
        onChange={(e) => setFormData({ ...formData, copyrightNote: e.target.value })}
        placeholder="输入版权相关信息"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TagSelector
          label="关联角色"
          availableTags={characterTags}
          selectedIds={formData.characterIds}
          onChange={(ids) => setFormData({ ...formData, characterIds: ids })}
          onAddNew={handleAddCharacter}
          placeholder="搜索角色..."
        />

        <TagSelector
          label="关联制作人员"
          availableTags={staffTags}
          selectedIds={formData.staffIds}
          onChange={(ids) => setFormData({ ...formData, staffIds: ids })}
          onAddNew={handleAddStaff}
          placeholder="搜索制作人员..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-300">页码标注（可选）</h3>
          <button
            type="button"
            onClick={handleAddPageReference}
            className="flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加页码
          </button>
        </div>

        {formData.pageReferences.map((ref, index) => (
          <div key={ref.id} className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-gray-400">页码 {index + 1}</span>
              <button
                type="button"
                onClick={() => handleRemovePageReference(index)}
                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="页码"
                type="number"
                value={ref.pageNumber}
                onChange={(e) =>
                  handleUpdatePageReference(index, {
                    pageNumber: parseInt(e.target.value) || 1,
                  })
                }
              />
              <FormInput
                label="描述"
                value={ref.description}
                onChange={(e) =>
                  handleUpdatePageReference(index, { description: e.target.value })
                }
                placeholder="该页内容描述"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <TagSelector
                label="关联角色"
                availableTags={characterTags}
                selectedIds={ref.characterIds}
                onChange={(ids) => handleUpdatePageReference(index, { characterIds: ids })}
                placeholder="搜索角色..."
              />
              <TagSelector
                label="关联制作人员"
                availableTags={staffTags}
                selectedIds={ref.staffIds}
                onChange={(ids) => handleUpdatePageReference(index, { staffIds: ids })}
                placeholder="搜索制作人员..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
        >
          {initialData ? '保存修改' : '添加资料'}
        </button>
      </div>
    </form>
  );
}
