import { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  FilterX,
  CheckSquare,
  Square,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useStore, BatchUpdateData } from '../store/useStore';
import {
  Material,
  MaterialType,
  MaterialTypeLabels,
  ScanStatus,
  ScanStatusLabels,
  SearchFilters,
} from '../types';
import { TagSelector } from '../components/TagSelector';

type Step = 'filter' | 'select' | 'edit' | 'preview';

const materialTypeOptions = Object.entries(MaterialTypeLabels) as [MaterialType, string][];
const scanStatusOptions = Object.entries(ScanStatusLabels) as [ScanStatus, string][];

export function BatchOrganize() {
  const materials = useStore((s) => s.materials);
  const characters = useStore((s) => s.characters);
  const staff = useStore((s) => s.staff);
  const getWorks = useStore((s) => s.getWorks);
  const searchMaterials = useStore((s) => s.searchMaterials);
  const addCharacter = useStore((s) => s.addCharacter);
  const addStaff = useStore((s) => s.addStaff);
  const batchUpdateMaterials = useStore((s) => s.batchUpdateMaterials);

  const works = getWorks();

  const [step, setStep] = useState<Step>('filter');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filteredResults, setFilteredResults] = useState<Material[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(true);

  const [batchData, setBatchData] = useState<BatchUpdateData>({});
  const [applyScanStatus, setApplyScanStatus] = useState(false);
  const [applyWork, setApplyWork] = useState(false);
  const [applyType, setApplyType] = useState(false);
  const [applyPurchaseSource, setApplyPurchaseSource] = useState(false);
  const [appendCharacters, setAppendCharacters] = useState(false);
  const [appendStaffTags, setAppendStaffTags] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: SearchFilters[keyof SearchFilters]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    const results = searchMaterials(filters);
    setFilteredResults(results);
    setSelectedIds(new Set());
    setStep('select');
  };

  const handleResetFilters = () => {
    setFilters({});
    setFilteredResults([]);
    setSelectedIds(new Set());
    setStep('filter');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((m) => m.id)));
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

  const goToEdit = () => {
    setBatchData({});
    setApplyScanStatus(false);
    setApplyWork(false);
    setApplyType(false);
    setApplyPurchaseSource(false);
    setAppendCharacters(false);
    setAppendStaffTags(false);
    setStep('edit');
  };

  const goToPreview = () => {
    const updates: BatchUpdateData = {};
    if (applyScanStatus && batchData.scanStatus !== undefined) updates.scanStatus = batchData.scanStatus;
    if (applyWork && batchData.work !== undefined) updates.work = batchData.work;
    if (applyType && batchData.type !== undefined) updates.type = batchData.type;
    if (applyPurchaseSource && batchData.purchaseSource !== undefined) updates.purchaseSource = batchData.purchaseSource;
    if (appendCharacters && batchData.appendCharacterIds && batchData.appendCharacterIds.length > 0) {
      updates.appendCharacterIds = batchData.appendCharacterIds;
    }
    if (appendStaffTags && batchData.appendStaffIds && batchData.appendStaffIds.length > 0) {
      updates.appendStaffIds = batchData.appendStaffIds;
    }
    setBatchData(updates);
    setStep('preview');
  };

  const handleApply = () => {
    batchUpdateMaterials(Array.from(selectedIds), batchData);
    resetAll();
  };

  const resetAll = () => {
    setStep('filter');
    setFilters({});
    setFilteredResults([]);
    setSelectedIds(new Set());
    setBatchData({});
    setApplyScanStatus(false);
    setApplyWork(false);
    setApplyType(false);
    setApplyPurchaseSource(false);
    setAppendCharacters(false);
    setAppendStaffTags(false);
  };

  const selectedMaterials = useMemo(
    () => materials.filter((m) => selectedIds.has(m.id)),
    [materials, selectedIds]
  );

  const hasAnyOperation =
    applyScanStatus || applyWork || applyType || applyPurchaseSource || appendCharacters || appendStaffTags;

  const getCharacterName = (id: string) => {
    const c = characters.find((ch) => ch.id === id);
    return c ? `${c.name} (${c.work})` : id;
  };

  const getStaffName = (id: string) => {
    const s = staff.find((st) => st.id === id);
    return s ? `${s.name} (${s.role})` : id;
  };

  const stepLabels: Record<Step, string> = {
    filter: '筛选资料',
    select: '选择资料',
    edit: '批量操作',
    preview: '变更预览',
  };

  const stepOrder: Step[] = ['filter', 'select', 'edit', 'preview'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            批量整理工作台
          </h1>
          <p className="text-gray-400">
            一次性筛选并批量修改多份资料
          </p>
        </div>
        {step !== 'filter' && (
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-secondary text-white text-sm font-medium"
          >
            <X className="w-4 h-4" />
            取消全部操作
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {stepOrder.map((s, i) => {
          const isActive = step === s;
          const isPast = stepOrder.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-accent-500/30" />}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                    : isPast
                    ? 'bg-accent-500/10 text-accent-400/60 border border-accent-500/10'
                    : 'bg-primary-800/30 text-gray-500 border border-transparent'
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current">
                  {isPast ? '✓' : i + 1}
                </span>
                {stepLabels[s]}
              </div>
            </div>
          );
        })}
      </div>

      {step === 'filter' && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-accent-500" />
              筛选条件
            </h2>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showFilterPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showFilterPanel && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">作品</label>
                  <select
                    value={filters.work || ''}
                    onChange={(e) => updateFilter('work', e.target.value || undefined)}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                  >
                    <option value="">全部作品</option>
                    {works.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">资料类型</label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => updateFilter('type', (e.target.value as MaterialType) || undefined)}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                  >
                    <option value="">全部类型</option>
                    {materialTypeOptions.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">角色</label>
                  <select
                    value={filters.characterId || ''}
                    onChange={(e) => updateFilter('characterId', e.target.value || undefined)}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                  >
                    <option value="">全部角色</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.work})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">制作人员</label>
                  <select
                    value={filters.staffId || ''}
                    onChange={(e) => updateFilter('staffId', e.target.value || undefined)}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
                  >
                    <option value="">全部人员</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">关键词</label>
                  <input
                    type="text"
                    value={filters.keyword || ''}
                    onChange={(e) => updateFilter('keyword', e.target.value || undefined)}
                    placeholder="搜索标题、描述等..."
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg btn-secondary text-white font-medium"
                >
                  <FilterX className="w-4 h-4" />
                  重置条件
                </button>
                <button
                  onClick={handleSearch}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
                >
                  <Search className="w-4 h-4" />
                  查找资料
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {selectedIds.size === filteredResults.length && filteredResults.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  全选
                </button>
                <span className="text-sm text-gray-400">
                  已选中 <span className="text-accent-400 font-medium">{selectedIds.size}</span> / {filteredResults.length} 条
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('filter');
                  }}
                  className="px-4 py-2 rounded-lg btn-secondary text-white text-sm font-medium"
                >
                  返回筛选
                </button>
                <button
                  onClick={goToEdit}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg btn-primary text-primary-900 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  批量操作 ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>

          {filteredResults.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-accent-500/20">
                    <th className="px-4 py-3 text-left w-10"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">标题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">作品</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">扫描状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">购买来源</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-b border-accent-500/10 transition-colors ${
                        selectedIds.has(m.id)
                          ? 'bg-accent-500/10'
                          : 'hover:bg-primary-800/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(m.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {selectedIds.has(m.id) ? (
                            <CheckSquare className="w-5 h-5 text-accent-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white text-sm">{m.title}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{m.work}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded bg-primary-700/50 text-gray-300">
                          {MaterialTypeLabels[m.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded ${
                            m.scanStatus === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : m.scanStatus === 'partial'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {ScanStatusLabels[m.scanStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{m.purchaseSource || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 glass rounded-xl">
              <Search className="w-12 h-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">未找到匹配的资料</h3>
              <p className="text-gray-400">尝试调整筛选条件后重新查找</p>
            </div>
          )}
        </div>
      )}

      {step === 'edit' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent-500" />
              批量操作设置
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              勾选需要修改的字段，未勾选的字段不会变更。角色和制作人员为追加模式，不会覆盖已有标签。
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setApplyScanStatus(!applyScanStatus)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {applyScanStatus ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">扫描状态</label>
                  <p className="text-xs text-gray-500 mb-3">覆盖为新的扫描状态</p>
                  <select
                    value={batchData.scanStatus || ''}
                    onChange={(e) => setBatchData({ ...batchData, scanStatus: e.target.value as ScanStatus })}
                    disabled={!applyScanStatus}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus disabled:opacity-40"
                  >
                    <option value="">选择扫描状态</option>
                    {scanStatusOptions.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setApplyWork(!applyWork)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {applyWork ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">作品名</label>
                  <p className="text-xs text-gray-500 mb-3">覆盖为新的作品名</p>
                  <input
                    type="text"
                    value={batchData.work || ''}
                    onChange={(e) => setBatchData({ ...batchData, work: e.target.value })}
                    disabled={!applyWork}
                    placeholder="输入新的作品名"
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setApplyType(!applyType)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {applyType ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">资料类型</label>
                  <p className="text-xs text-gray-500 mb-3">覆盖为新的资料类型</p>
                  <select
                    value={batchData.type || ''}
                    onChange={(e) => setBatchData({ ...batchData, type: e.target.value as MaterialType })}
                    disabled={!applyType}
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus disabled:opacity-40"
                  >
                    <option value="">选择资料类型</option>
                    {materialTypeOptions.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setApplyPurchaseSource(!applyPurchaseSource)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {applyPurchaseSource ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">购买来源</label>
                  <p className="text-xs text-gray-500 mb-3">覆盖为新的购买来源</p>
                  <input
                    type="text"
                    value={batchData.purchaseSource || ''}
                    onChange={(e) => setBatchData({ ...batchData, purchaseSource: e.target.value })}
                    disabled={!applyPurchaseSource}
                    placeholder="如：日亚、骏河屋、淘宝等"
                    className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setAppendCharacters(!appendCharacters)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {appendCharacters ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">追加角色标签</label>
                  <p className="text-xs text-gray-500 mb-3">追加到已有角色列表，不会覆盖已有标签</p>
                  <TagSelector
                    label=""
                    availableTags={characters.map((c) => ({ id: c.id, name: c.name, secondary: c.work }))}
                    selectedIds={batchData.appendCharacterIds || []}
                    onChange={(ids) => setBatchData({ ...batchData, appendCharacterIds: ids })}
                    onAddNew={(name) => addCharacter({ name, work: '' })}
                    placeholder="搜索角色..."
                  />
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary-800/30 border border-accent-500/10">
                <button
                  onClick={() => setAppendStaffTags(!appendStaffTags)}
                  className="mt-1 text-gray-400 hover:text-white transition-colors"
                >
                  {appendStaffTags ? (
                    <CheckSquare className="w-5 h-5 text-accent-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-1">追加制作人员标签</label>
                  <p className="text-xs text-gray-500 mb-3">追加到已有制作人员列表，不会覆盖已有标签</p>
                  <TagSelector
                    label=""
                    availableTags={staff.map((s) => ({ id: s.id, name: s.name, secondary: s.role }))}
                    selectedIds={batchData.appendStaffIds || []}
                    onChange={(ids) => setBatchData({ ...batchData, appendStaffIds: ids })}
                    onAddNew={(name) => addStaff({ name, role: '其他', works: [] })}
                    placeholder="搜索制作人员..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-accent-500/20">
              <button
                onClick={() => setStep('select')}
                className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
              >
                返回选择
              </button>
              <button
                onClick={goToPreview}
                disabled={!hasAnyOperation}
                className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                预览变更
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-accent-500" />
              变更预览
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              以下为即将应用的变更，请仔细确认后再提交。
            </p>

            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-accent-400">覆盖字段</h3>
              {batchData.scanStatus !== undefined && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">
                    扫描状态 → <span className="text-white font-medium">{ScanStatusLabels[batchData.scanStatus]}</span>
                  </span>
                </div>
              )}
              {batchData.work !== undefined && batchData.work !== '' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">
                    作品名 → <span className="text-white font-medium">{batchData.work}</span>
                  </span>
                </div>
              )}
              {batchData.type !== undefined && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">
                    资料类型 → <span className="text-white font-medium">{MaterialTypeLabels[batchData.type]}</span>
                  </span>
                </div>
              )}
              {batchData.purchaseSource !== undefined && batchData.purchaseSource !== '' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">
                    购买来源 → <span className="text-white font-medium">{batchData.purchaseSource}</span>
                  </span>
                </div>
              )}
              {!(batchData.scanStatus !== undefined || (batchData.work !== undefined && batchData.work !== '') || batchData.type !== undefined || (batchData.purchaseSource !== undefined && batchData.purchaseSource !== '')) && (
                <p className="text-sm text-gray-500">无覆盖字段</p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-green-400">追加标签</h3>
              {batchData.appendCharacterIds && batchData.appendCharacterIds.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <span className="text-sm text-gray-300">追加角色：</span>
                  <div className="flex flex-wrap gap-1">
                    {batchData.appendCharacterIds.map((id) => (
                      <span key={id} className="px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400">
                        {getCharacterName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {batchData.appendStaffIds && batchData.appendStaffIds.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-800/30 border border-accent-500/10">
                  <span className="text-sm text-gray-300">追加制作人员：</span>
                  <div className="flex flex-wrap gap-1">
                    {batchData.appendStaffIds.map((id) => (
                      <span key={id} className="px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400">
                        {getStaffName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!(batchData.appendCharacterIds && batchData.appendCharacterIds.length > 0) &&
                !(batchData.appendStaffIds && batchData.appendStaffIds.length > 0) && (
                  <p className="text-sm text-gray-500">无追加标签</p>
                )}
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-gray-300">
                受影响资料 <span className="text-accent-400">({selectedMaterials.length})</span>
              </h3>
              <div className="max-h-64 overflow-y-auto glass rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-accent-500/20">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">标题</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">作品</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">变更说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMaterials.map((m) => {
                      const changes: string[] = [];
                      if (batchData.scanStatus !== undefined && m.scanStatus !== batchData.scanStatus) {
                        changes.push(`扫描状态: ${ScanStatusLabels[m.scanStatus]} → ${ScanStatusLabels[batchData.scanStatus]}`);
                      }
                      if (batchData.work !== undefined && m.work !== batchData.work) {
                        changes.push(`作品: ${m.work || '(空)'} → ${batchData.work}`);
                      }
                      if (batchData.type !== undefined && m.type !== batchData.type) {
                        changes.push(`类型: ${MaterialTypeLabels[m.type]} → ${MaterialTypeLabels[batchData.type]}`);
                      }
                      if (batchData.purchaseSource !== undefined && m.purchaseSource !== batchData.purchaseSource) {
                        changes.push(`来源: ${m.purchaseSource || '(空)'} → ${batchData.purchaseSource}`);
                      }
                      if (batchData.appendCharacterIds && batchData.appendCharacterIds.length > 0) {
                        const newChars = batchData.appendCharacterIds.filter((id) => !m.characterIds.includes(id));
                        if (newChars.length > 0) {
                          changes.push(`追加角色: ${newChars.map(getCharacterName).join(', ')}`);
                        }
                      }
                      if (batchData.appendStaffIds && batchData.appendStaffIds.length > 0) {
                        const newStaff = batchData.appendStaffIds.filter((id) => !m.staffIds.includes(id));
                        if (newStaff.length > 0) {
                          changes.push(`追加人员: ${newStaff.map(getStaffName).join(', ')}`);
                        }
                      }
                      return (
                        <tr key={m.id} className="border-b border-accent-500/10">
                          <td className="px-4 py-2 text-white text-sm">{m.title}</td>
                          <td className="px-4 py-2 text-gray-300 text-sm">{m.work}</td>
                          <td className="px-4 py-2 text-xs text-gray-400">
                            {changes.length > 0 ? changes.map((c, i) => (
                              <div key={i} className="mb-0.5">{c}</div>
                            )) : (
                              <span className="text-gray-600">无变更</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-accent-500/20">
              <button
                onClick={() => setStep('edit')}
                className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
              >
                返回修改
              </button>
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                取消操作
              </button>
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
              >
                <CheckSquare className="w-4 h-4" />
                确认应用 ({selectedMaterials.length} 条)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
