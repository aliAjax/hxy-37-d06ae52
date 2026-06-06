import { useState, useMemo } from 'react';
import {
  Star,
  ShoppingBag,
  Scan,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  Save,
  X,
  Filter,
  Search,
  Calendar,
  BookMarked,
  Layers
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { FormInput, FormTextarea, FormSelect } from '../components/FormInput';
import { TagSelector } from '../components/TagSelector';
import {
  MaterialType,
  MaterialTypeLabels,
  ScanPriority,
  ScanPriorityLabels,
  WishPriority,
  WishPriorityLabels,
  WishItem,
  Material,
} from '../types';

type KanbanColumn = 'wish' | 'unscanned' | 'partial' | 'completed';

interface KanbanCard {
  column: KanbanColumn;
  work: string;
  type: MaterialType;
  items: (WishItem | Material)[];
  count: number;
}

interface WorkGroup {
  work: string;
  cards: Record<KanbanColumn, KanbanCard[]>;
  totalCount: number;
}

const columnConfig: Record<KanbanColumn, {
  label: string;
  icon: typeof Star;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  wish: {
    label: '愿望清单',
    icon: Star,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  unscanned: {
    label: '已购买未扫描',
    icon: ShoppingBag,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  partial: {
    label: '部分扫描',
    icon: Scan,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  completed: {
    label: '已完成资料',
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
};

const typeOptions: { value: MaterialType; label: string }[] = [
  { value: 'artbook', label: '原画集' },
  { value: 'storyboard', label: '分镜集' },
  { value: 'setting', label: '设定集' },
  { value: 'magazine', label: '杂志切页' },
  { value: 'special', label: '特典册' },
];

const priorityOptions: { value: ScanPriority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const emptyConvertForm = {
  publisher: '',
  publishDate: '',
  pageCount: 0,
  copyrightNote: '',
  characterIds: [] as string[],
  staffIds: [] as string[],
};

const emptyTaskForm = {
  priority: 'medium' as ScanPriority,
  plannedDate: '',
  notes: '',
};

export function CollectionKanban() {
  const wishItems = useStore((state) => state.wishItems);
  const materials = useStore((state) => state.materials);
  const scanTasks = useStore((state) => state.scanTasks);
  const convertWishToMaterial = useStore((state) => state.convertWishToMaterial);
  const setScanTask = useStore((state) => state.setScanTask);
  const completeMaterialScan = useStore((state) => state.completeMaterialScan);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const addCharacter = useStore((state) => state.addCharacter);
  const addStaff = useStore((state) => state.addStaff);

  const [workFilter, setWorkFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | ''>('');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingWish, setConvertingWish] = useState<WishItem | null>(null);
  const [convertFormData, setConvertFormData] = useState(emptyConvertForm);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskMaterial, setTaskMaterial] = useState<Material | null>(null);
  const [taskFormData, setTaskFormData] = useState(emptyTaskForm);

  const works = useMemo(() => {
    const workSet = new Set<string>();
    wishItems.forEach((w) => workSet.add(w.work));
    materials.forEach((m) => workSet.add(m.work));
    return Array.from(workSet).filter(Boolean).sort();
  }, [wishItems, materials]);

  const workGroups = useMemo<WorkGroup[]>(() => {
    const workMap = new Map<string, WorkGroup>();

    const addToGroup = (work: string, column: KanbanColumn, type: MaterialType, item: WishItem | Material) => {
      if (!workMap.has(work)) {
        workMap.set(work, {
          work,
          cards: {
            wish: [],
            unscanned: [],
            partial: [],
            completed: [],
          },
          totalCount: 0,
        });
      }
      const group = workMap.get(work)!;
      group.totalCount++;

      const typeCard = group.cards[column].find((c) => c.type === type);
      if (typeCard) {
        typeCard.items.push(item);
        typeCard.count++;
      } else {
        group.cards[column].push({
          column,
          work,
          type,
          items: [item],
          count: 1,
        });
      }
    };

    wishItems.forEach((item) => {
      addToGroup(item.work, 'wish', item.type, item);
    });

    materials.forEach((item) => {
      const column: KanbanColumn = item.scanStatus === 'unscanned'
        ? 'unscanned'
        : item.scanStatus === 'partial'
        ? 'partial'
        : 'completed';
      addToGroup(item.work, column, item.type, item);
    });

    return Array.from(workMap.values()).sort((a, b) => a.work.localeCompare(b.work));
  }, [wishItems, materials]);

  const filteredGroups = useMemo(() => {
    let result = workGroups;

    if (workFilter) {
      result = result.filter((g) => g.work === workFilter);
    }

    if (typeFilter) {
      result = result.map((g) => {
        const filteredCards: Record<KanbanColumn, KanbanCard[]> = {
          wish: g.cards.wish.filter((c) => c.type === typeFilter),
          unscanned: g.cards.unscanned.filter((c) => c.type === typeFilter),
          partial: g.cards.partial.filter((c) => c.type === typeFilter),
          completed: g.cards.completed.filter((c) => c.type === typeFilter),
        };
        const totalCount = Object.values(filteredCards).flat().reduce((sum, c) => sum + c.count, 0);
        return { ...g, cards: filteredCards, totalCount };
      }).filter((g) => g.totalCount > 0);
    }

    if (keywordFilter) {
      const keyword = keywordFilter.toLowerCase();
      result = result.map((g) => {
        const filterCards = (cards: KanbanCard[]) =>
          cards
            .map((c) => ({
              ...c,
              items: c.items.filter((item) =>
                item.title.toLowerCase().includes(keyword)
              ),
            }))
            .filter((c) => c.items.length > 0)
            .map((c) => ({ ...c, count: c.items.length }));

        const filteredCards: Record<KanbanColumn, KanbanCard[]> = {
          wish: filterCards(g.cards.wish),
          unscanned: filterCards(g.cards.unscanned),
          partial: filterCards(g.cards.partial),
          completed: filterCards(g.cards.completed),
        };
        const totalCount = Object.values(filteredCards).flat().reduce((sum, c) => sum + c.count, 0);
        return { ...g, cards: filteredCards, totalCount };
      }).filter((g) => g.totalCount > 0);
    }

    return result;
  }, [workGroups, workFilter, typeFilter, keywordFilter]);

  const columnStats = useMemo(() => {
    const stats: Record<KanbanColumn, number> = {
      wish: wishItems.length,
      unscanned: materials.filter((m) => m.scanStatus === 'unscanned').length,
      partial: materials.filter((m) => m.scanStatus === 'partial').length,
      completed: materials.filter((m) => m.scanStatus === 'completed').length,
    };
    return stats;
  }, [wishItems, materials]);

  const toggleWorkExpand = (work: string) => {
    setExpandedWorks((prev) => {
      const next = new Set(prev);
      if (next.has(work)) {
        next.delete(work);
      } else {
        next.add(work);
      }
      return next;
    });
  };

  const handleConvertWish = (wish: WishItem) => {
    setConvertingWish(wish);
    setConvertFormData(emptyConvertForm);
    setIsConvertModalOpen(true);
  };

  const handleSubmitConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingWish) return;

    const additionalData: Partial<Material> = {
      publisher: convertFormData.publisher,
      publishDate: convertFormData.publishDate,
      pageCount: convertFormData.pageCount,
      pageEnd: convertFormData.pageCount,
      copyrightNote: convertFormData.copyrightNote,
      characterIds: convertFormData.characterIds,
      staffIds: convertFormData.staffIds,
    };

    convertWishToMaterial(convertingWish.id, additionalData);
    setIsConvertModalOpen(false);
    setConvertingWish(null);
    setConvertFormData(emptyConvertForm);
  };

  const handleCreateTask = (material: Material) => {
    setTaskMaterial(material);
    const existingTask = scanTasks[material.id];
    setTaskFormData({
      priority: existingTask?.priority || 'medium',
      plannedDate: existingTask?.plannedDate || '',
      notes: existingTask?.notes || '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskMaterial) return;

    setScanTask(taskMaterial.id, {
      priority: taskFormData.priority,
      plannedDate: taskFormData.plannedDate,
      notes: taskFormData.notes,
    });
    setIsTaskModalOpen(false);
    setTaskMaterial(null);
    setTaskFormData(emptyTaskForm);
  };

  const handleMarkCompleted = (materialId: string) => {
    if (window.confirm('确定要标记为已完成扫描吗？')) {
      completeMaterialScan(materialId);
    }
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
    addCharacter({ name, work: convertingWish?.work || '' });
  };

  const handleAddStaff = (name: string) => {
    addStaff({ name, role: '其他', works: convertingWish?.work ? [convertingWish.work] : [] });
  };

  const getWishPriorityColor = (priority: WishPriority) => {
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

  const getScanPriorityColor = (priority?: ScanPriority) => {
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

  const renderCardItems = (card: KanbanCard) => {
    return card.items.map((item) => {
      const isWish = 'estimatedPrice' in item;
      const scanTask = !isWish ? scanTasks[item.id] : undefined;

      return (
        <div
          key={(item as WishItem).id || (item as Material).id}
          className={`p-2 rounded-lg border ${
            card.column === 'wish'
              ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
              : card.column === 'unscanned'
              ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
              : card.column === 'partial'
              ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
              : 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
          } transition-colors`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isWish ? (
                  <span className={`px-1.5 py-0.5 rounded text-xs border ${getWishPriorityColor(item.priority)}`}>
                    {WishPriorityLabels[item.priority]}
                  </span>
                ) : (
                  scanTask?.priority && (
                    <span className={`px-1.5 py-0.5 rounded text-xs border ${getScanPriorityColor(scanTask.priority)}`}>
                      {ScanPriorityLabels[scanTask.priority]}
                    </span>
                  )
                )}
                {!isWish && scanTask?.plannedDate && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {scanTask.plannedDate}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {card.column === 'wish' && (
                <button
                  onClick={() => handleConvertWish(item as WishItem)}
                  className="p-1 rounded text-yellow-500 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors"
                  title="入手转为资料"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {card.column === 'unscanned' && (
                <button
                  onClick={() => handleCreateTask(item as Material)}
                  className="p-1 rounded text-blue-500 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                  title="创建扫描任务"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {card.column === 'partial' && (
                <button
                  onClick={() => handleMarkCompleted(item.id)}
                  className="p-1 rounded text-green-500 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                  title="标记为已完成"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            收藏入库流程看板
          </h1>
          <p className="text-gray-400">
            从愿望清单到已完成资料，全流程追踪收藏状态
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(columnConfig) as [KanbanColumn, typeof columnConfig[KanbanColumn]][]).map(
          ([column, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={column}
                className={`glass rounded-xl p-4 border ${config.borderColor}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{config.label}</p>
                    <p className="text-2xl font-bold text-white">{columnStats[column]}</p>
                  </div>
                </div>
              </div>
            );
          }
        )}
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
                placeholder="搜索标题..."
                className="pl-10 pr-4 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white text-sm input-focus w-48"
              />
            </div>

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
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const isExpanded = expandedWorks.has(group.work) || filteredGroups.length <= 5;
            const hasAnyCards = Object.values(group.cards).some((cards) => cards.length > 0);

            if (!hasAnyCards) return null;

            return (
              <div
                key={group.work}
                className="glass rounded-xl border border-accent-500/20 overflow-hidden"
              >
                <button
                  onClick={() => toggleWorkExpand(group.work)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent-500/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <BookMarked className="w-4 h-4 text-accent-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{group.work || '未指定作品'}</h3>
                    <p className="text-sm text-gray-400">
                      共 {group.totalCount} 项资料
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-xs">
                      <span className="text-yellow-500">
                        愿望: {group.cards.wish.reduce((s, c) => s + c.count, 0)}
                      </span>
                      <span className="text-blue-500">
                        未扫: {group.cards.unscanned.reduce((s, c) => s + c.count, 0)}
                      </span>
                      <span className="text-orange-500">
                        部分: {group.cards.partial.reduce((s, c) => s + c.count, 0)}
                      </span>
                      <span className="text-green-500">
                        完成: {group.cards.completed.reduce((s, c) => s + c.count, 0)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-accent-500/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                      {(Object.entries(columnConfig) as [KanbanColumn, typeof columnConfig[KanbanColumn]][]).map(
                        ([column, config]) => {
                          const cards = group.cards[column];
                          const Icon = config.icon;

                          return (
                            <div
                              key={column}
                              className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <span className={`text-sm font-medium ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="ml-auto text-xs text-gray-400">
                                  {cards.reduce((s, c) => s + c.count, 0)}
                                </span>
                              </div>

                              {cards.length > 0 ? (
                                <div className="space-y-2">
                                  {cards.map((card) => (
                                    <div key={card.type} className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                          {MaterialTypeLabels[card.type]}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({card.count})
                                        </span>
                                      </div>
                                      <div className="space-y-1.5 pl-2 border-l-2 border-accent-500/10">
                                        {renderCardItems(card)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-4 text-center">
                                  <p className="text-xs text-gray-500">暂无</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
              <Layers className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">暂无数据</h3>
            <p className="text-gray-400">
              {works.length === 0
                ? '还没有任何愿望或资料，去添加一些吧！'
                : '没有找到匹配的结果，试试调整筛选条件'}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setConvertingWish(null);
          setConvertFormData(emptyConvertForm);
        }}
        title="转换为正式资料"
        size="lg"
      >
        <form onSubmit={handleSubmitConvert} className="space-y-6">
          {convertingWish && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <h4 className="font-medium text-white mb-2">即将转换的愿望</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">标题：</span>
                  <span className="text-white">{convertingWish.title}</span>
                </div>
                <div>
                  <span className="text-gray-500">作品：</span>
                  <span className="text-white">{convertingWish.work}</span>
                </div>
                <div>
                  <span className="text-gray-500">类型：</span>
                  <span className="text-white">{MaterialTypeLabels[convertingWish.type]}</span>
                </div>
                <div>
                  <span className="text-gray-500">购买渠道：</span>
                  <span className="text-white">{convertingWish.purchaseChannel || '-'}</span>
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
              onClick={() => {
                setIsConvertModalOpen(false);
                setConvertingWish(null);
                setConvertFormData(emptyConvertForm);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-secondary text-white font-medium"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              确认转换
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskMaterial(null);
          setTaskFormData(emptyTaskForm);
        }}
        title={scanTasks[taskMaterial?.id || ''] ? '编辑扫描任务' : '创建扫描任务'}
        size="md"
      >
        <form onSubmit={handleSubmitTask} className="space-y-6">
          {taskMaterial && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium text-white mb-2">资料信息</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">标题：</span>
                  <span className="text-white">{taskMaterial.title}</span>
                </div>
                <div>
                  <span className="text-gray-500">作品：</span>
                  <span className="text-white">{taskMaterial.work}</span>
                </div>
                <div>
                  <span className="text-gray-500">类型：</span>
                  <span className="text-white">{MaterialTypeLabels[taskMaterial.type]}</span>
                </div>
                <div>
                  <span className="text-gray-500">页数：</span>
                  <span className="text-white">{taskMaterial.pageCount} 页</span>
                </div>
              </div>
            </div>
          )}

          <FormSelect
            label="优先级"
            options={priorityOptions}
            value={taskFormData.priority}
            onChange={(v) => setTaskFormData({ ...taskFormData, priority: v as ScanPriority })}
          />

          <FormInput
            label="计划日期"
            type="date"
            value={taskFormData.plannedDate}
            onChange={(e) => setTaskFormData({ ...taskFormData, plannedDate: e.target.value })}
          />

          <FormTextarea
            label="备注"
            value={taskFormData.notes}
            onChange={(e) => setTaskFormData({ ...taskFormData, notes: e.target.value })}
            placeholder="添加扫描任务备注..."
          />

          <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
            <button
              type="button"
              onClick={() => {
                setIsTaskModalOpen(false);
                setTaskMaterial(null);
                setTaskFormData(emptyTaskForm);
              }}
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
              保存
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
