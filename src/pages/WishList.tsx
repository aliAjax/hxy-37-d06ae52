import { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Star,
  DollarSign,
  AlertCircle,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  ArrowRight,
  ShoppingCart,
  Check
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { FormInput, FormTextarea, FormSelect } from '../components/FormInput';
import { TagSelector } from '../components/TagSelector';
import {
  MaterialType,
  MaterialTypeLabels,
  WishPriority,
  WishPriorityLabels,
  WishItem,
  Material,
} from '../types';

const typeOptions: { value: MaterialType; label: string }[] = [
  { value: 'artbook', label: '原画集' },
  { value: 'storyboard', label: '分镜集' },
  { value: 'setting', label: '设定集' },
  { value: 'magazine', label: '杂志切页' },
  { value: 'special', label: '特典册' },
];

const priorityOptions: { value: WishPriority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '必入' },
];

const emptyForm = {
  title: '',
  work: '',
  type: 'artbook' as MaterialType,
  estimatedPrice: 0,
  purchaseChannel: '',
  priority: 'medium' as WishPriority,
  notes: '',
};

const emptyConvertForm = {
  publisher: '',
  publishDate: '',
  pageCount: 0,
  copyrightNote: '',
  characterIds: [] as string[],
  staffIds: [] as string[],
};

export function WishList() {
  const wishItems = useStore((state) => state.wishItems);
  const addWishItem = useStore((state) => state.addWishItem);
  const updateWishItem = useStore((state) => state.updateWishItem);
  const deleteWishItem = useStore((state) => state.deleteWishItem);
  const convertWishToMaterial = useStore((state) => state.convertWishToMaterial);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const addCharacter = useStore((state) => state.addCharacter);
  const addStaff = useStore((state) => state.addStaff);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingItem, setConvertingItem] = useState<WishItem | null>(null);
  const [convertFormData, setConvertFormData] = useState(emptyConvertForm);

  const [typeFilter, setTypeFilter] = useState<MaterialType | ''>('');
  const [workFilter, setWorkFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<WishPriority | ''>('');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'price' | 'title'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const works = useMemo(() => {
    return Array.from(new Set(wishItems.map((w) => w.work))).filter(Boolean).sort();
  }, [wishItems]);

  const stats = useMemo(() => {
    const byPriority: Record<WishPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    let totalEstimatedPrice = 0;

    wishItems.forEach((w) => {
      byPriority[w.priority]++;
      totalEstimatedPrice += w.estimatedPrice || 0;
    });

    return {
      total: wishItems.length,
      byPriority,
      totalEstimatedPrice,
    };
  }, [wishItems]);

  const filteredItems = useMemo(() => {
    let result = [...wishItems];

    if (typeFilter) {
      result = result.filter((w) => w.type === typeFilter);
    }
    if (workFilter) {
      result = result.filter((w) => w.work === workFilter);
    }
    if (priorityFilter) {
      result = result.filter((w) => w.priority === priorityFilter);
    }
    if (keywordFilter) {
      const keyword = keywordFilter.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(keyword) ||
          w.work.toLowerCase().includes(keyword) ||
          w.notes.toLowerCase().includes(keyword) ||
          w.purchaseChannel.toLowerCase().includes(keyword)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'price') {
        comparison = (a.estimatedPrice || 0) - (b.estimatedPrice || 0);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [wishItems, typeFilter, workFilter, priorityFilter, keywordFilter, sortBy, sortOrder]);

  const getPriorityColor = (priority: WishPriority) => {
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    if (!formData.work.trim()) {
      newErrors.work = '作品名称不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingItem) {
      updateWishItem(editingItem.id, formData);
    } else {
      addWishItem(formData);
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
    setErrors({});
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: WishItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      work: item.work,
      type: item.type,
      estimatedPrice: item.estimatedPrice,
      purchaseChannel: item.purchaseChannel,
      priority: item.priority,
      notes: item.notes,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个愿望吗？')) {
      deleteWishItem(id);
    }
  };

  const handleConvert = (id: string) => {
    const wish = wishItems.find((w) => w.id === id);
    if (!wish) return;

    setConvertingItem(wish);
    setConvertFormData({
      publisher: '',
      publishDate: '',
      pageCount: 0,
      copyrightNote: '',
      characterIds: [],
      staffIds: [],
    });
    setIsConvertModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
    setErrors({});
  };

  const handleCloseConvertModal = () => {
    setIsConvertModalOpen(false);
    setConvertingItem(null);
    setConvertFormData(emptyConvertForm);
  };

  const handleSubmitConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingItem) return;

    const additionalData: Partial<Material> = {
      publisher: convertFormData.publisher,
      publishDate: convertFormData.publishDate,
      pageCount: convertFormData.pageCount,
      pageEnd: convertFormData.pageCount,
      copyrightNote: convertFormData.copyrightNote,
      characterIds: convertFormData.characterIds,
      staffIds: convertFormData.staffIds,
    };

    convertWishToMaterial(convertingItem.id, additionalData);
    handleCloseConvertModal();
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
    addCharacter({ name, work: convertingItem?.work || '' });
  };

  const handleAddStaff = (name: string) => {
    addStaff({ name, role: '其他', works: convertingItem?.work ? [convertingItem.work] : [] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            愿望清单
          </h1>
          <p className="text-gray-400">
            记录还没入手的动画资料
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-3 rounded-lg btn-primary text-primary-900 font-medium"
        >
          <Plus className="w-5 h-5" />
          添加愿望
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">愿望总数</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">预估总价</p>
              <p className="text-2xl font-bold text-white">¥{stats.totalEstimatedPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">必入数量</p>
              <p className="text-2xl font-bold text-white">{stats.byPriority.urgent}</p>
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

          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="搜索关键词..."
                className="pl-10 pr-4 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus w-48"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MaterialType | '')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部类型</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as WishPriority | '')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="">全部优先级</option>
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'price' | 'title')}
              className="px-3 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus"
            >
              <option value="priority">优先级</option>
              <option value="price">价格</option>
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

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass rounded-xl p-5 border border-accent-500/20 hover:border-accent-500/40 transition-colors"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(item.priority)}`}>
                      {WishPriorityLabels[item.priority]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">作品：</span>{item.work}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">类型：</span>{MaterialTypeLabels[item.type]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    ¥{item.estimatedPrice?.toLocaleString() || 0}
                  </span>
                  {item.purchaseChannel && (
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="w-4 h-4 text-blue-400" />
                      {item.purchaseChannel}
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-sm text-gray-400 bg-primary-800/30 rounded-lg p-3 mb-4 flex-1">
                    {item.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-accent-500/10 mt-auto">
                  <button
                    onClick={() => handleConvert(item.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors"
                    title="转换为正式资料"
                  >
                    <ArrowRight className="w-4 h-4" />
                    入手
                  </button>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg text-gray-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
            <Star className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {wishItems.length === 0 ? '还没有愿望' : '未找到匹配的愿望'}
          </h3>
          <p className="text-gray-400">
            {wishItems.length === 0
              ? '点击右上角"添加愿望"开始记录你想要入手的资料吧！'
              : '尝试调整筛选条件'}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? '编辑愿望' : '添加愿望'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="资料标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={errors.title}
                required
                placeholder="输入资料标题"
              />
            </div>

            <div className="md:col-span-2">
              <FormInput
                label="所属作品"
                value={formData.work}
                onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                error={errors.work}
                required
                placeholder="输入作品名称"
              />
            </div>

            <FormSelect
              label="资料类型"
              options={typeOptions}
              value={formData.type}
              onChange={(v) => setFormData({ ...formData, type: v as MaterialType })}
            />

            <FormSelect
              label="优先级"
              options={priorityOptions}
              value={formData.priority}
              onChange={(v) => setFormData({ ...formData, priority: v as WishPriority })}
            />

            <FormInput
              label="预估价格（元）"
              type="number"
              value={formData.estimatedPrice || ''}
              onChange={(e) =>
                setFormData({ ...formData, estimatedPrice: parseInt(e.target.value) || 0 })
              }
              placeholder="输入预估价格"
            />

            <FormInput
              label="购买渠道"
              value={formData.purchaseChannel}
              onChange={(e) => setFormData({ ...formData, purchaseChannel: e.target.value })}
              placeholder="如：日亚、骏河屋、淘宝等"
            />
          </div>

          <FormTextarea
            label="备注"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="添加备注信息..."
          />

          <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-secondary text-white font-medium"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <Save className="w-4 h-4" />
              {editingItem ? '保存修改' : '添加愿望'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isConvertModalOpen}
        onClose={handleCloseConvertModal}
        title="转换为正式资料"
        size="lg"
      >
        <form onSubmit={handleSubmitConvert} className="space-y-6">
          {convertingItem && (
            <div className="p-4 rounded-lg bg-accent-500/10 border border-accent-500/20">
              <h4 className="font-medium text-white mb-2">即将转换的愿望</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">标题：</span>
                  <span className="text-white">{convertingItem.title}</span>
                </div>
                <div>
                  <span className="text-gray-500">作品：</span>
                  <span className="text-white">{convertingItem.work}</span>
                </div>
                <div>
                  <span className="text-gray-500">类型：</span>
                  <span className="text-white">{MaterialTypeLabels[convertingItem.type]}</span>
                </div>
                <div>
                  <span className="text-gray-500">购买渠道：</span>
                  <span className="text-white">{convertingItem.purchaseChannel || '-'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="出版社"
              value={convertFormData.publisher}
              onChange={(e) => setConvertFormData({ ...convertFormData, publisher: e.target.value })}
              placeholder="输入出版社名称"
            />

            <FormInput
              label="出版日期"
              type="date"
              value={convertFormData.publishDate}
              onChange={(e) => setConvertFormData({ ...convertFormData, publishDate: e.target.value })}
            />

            <FormInput
              label="页数"
              type="number"
              value={convertFormData.pageCount || ''}
              onChange={(e) =>
                setConvertFormData({ ...convertFormData, pageCount: parseInt(e.target.value) || 0 })
              }
              placeholder="输入总页数"
            />
          </div>

          <FormTextarea
            label="版权备注"
            value={convertFormData.copyrightNote}
            onChange={(e) => setConvertFormData({ ...convertFormData, copyrightNote: e.target.value })}
            placeholder="输入版权相关信息"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TagSelector
              label="关联角色"
              availableTags={characterTags}
              selectedIds={convertFormData.characterIds}
              onChange={(ids) => setConvertFormData({ ...convertFormData, characterIds: ids })}
              onAddNew={handleAddCharacter}
              placeholder="搜索角色..."
            />

            <TagSelector
              label="关联制作人员"
              availableTags={staffTags}
              selectedIds={convertFormData.staffIds}
              onChange={(ids) => setConvertFormData({ ...convertFormData, staffIds: ids })}
              onAddNew={handleAddStaff}
              placeholder="搜索制作人员..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
            <button
              type="button"
              onClick={handleCloseConvertModal}
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-secondary text-white font-medium"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <Check className="w-4 h-4" />
              确认转换
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
