import { useState, useMemo } from 'react';
import { Search, FilterX, BookMarked, Users, User, Calendar, FileText, Palette, ScanLine } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SearchFilters, Material, MaterialType, MaterialTypeLabels, ScanStatus, ScanStatusLabels } from '../types';
import { MaterialCard } from '../components/MaterialCard';
import { Modal } from '../components/Modal';
import { MaterialDetail } from '../components/MaterialDetail';

export function AdvancedSearch() {
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const getWorks = useStore((state) => state.getWorks);
  const searchMaterials = useStore((state) => state.searchMaterials);

  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<Material[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  const allWorks = getWorks();
  const allTypeOptions = Object.entries(MaterialTypeLabels) as [MaterialType, string][];
  const allScanStatusOptions = Object.entries(ScanStatusLabels) as [ScanStatus, string][];

  const previewResults = useMemo(() => {
    return searchMaterials(filters);
  }, [filters, searchMaterials]);

  const availableWorks = useMemo(() => {
    const works = new Set<string>();
    previewResults.forEach((m) => {
      if (m.work) works.add(m.work);
    });
    if (filters.work) works.add(filters.work);
    return Array.from(works).sort();
  }, [previewResults, filters.work]);

  const availableTypes = useMemo(() => {
    const types = new Set<MaterialType>();
    previewResults.forEach((m) => types.add(m.type));
    if (filters.type) types.add(filters.type);
    return allTypeOptions.filter(([value]) => types.has(value));
  }, [previewResults, filters.type, allTypeOptions]);

  const availableScanStatuses = useMemo(() => {
    const statuses = new Set<ScanStatus>();
    previewResults.forEach((m) => statuses.add(m.scanStatus));
    if (filters.scanStatus) statuses.add(filters.scanStatus);
    return allScanStatusOptions.filter(([value]) => statuses.has(value));
  }, [previewResults, filters.scanStatus, allScanStatusOptions]);

  const availableCharacters = useMemo(() => {
    const charIds = new Set<string>();
    previewResults.forEach((m) => {
      m.characterIds.forEach((id) => charIds.add(id));
    });
    if (filters.characterId) charIds.add(filters.characterId);
    return characters.filter((c) => charIds.has(c.id));
  }, [previewResults, filters.characterId, characters]);

  const availableStaff = useMemo(() => {
    const staffIds = new Set<string>();
    previewResults.forEach((m) => {
      m.staffIds.forEach((id) => staffIds.add(id));
    });
    if (filters.staffId) staffIds.add(filters.staffId);
    return staff.filter((s) => staffIds.has(s.id));
  }, [previewResults, filters.staffId, staff]);

  const availableStaffRoles = useMemo(() => {
    const roles = new Set<string>();
    previewResults.forEach((m) => {
      m.staffIds.forEach((staffId) => {
        const s = staff.find((item) => item.id === staffId);
        if (s?.role) roles.add(s.role);
      });
    });
    if (filters.staffRole) roles.add(filters.staffRole);
    return Array.from(roles).sort();
  }, [previewResults, filters.staffRole, staff]);

  const publishYears = useMemo(() => {
    const years = new Set<number>();
    previewResults.forEach((m) => {
      if (m.publishDate) {
        const year = parseInt(m.publishDate.split('-')[0]);
        if (!isNaN(year)) years.add(year);
      }
    });
    if (filters.yearFrom) years.add(filters.yearFrom);
    if (filters.yearTo) years.add(filters.yearTo);
    return Array.from(years).sort((a, b) => a - b);
  }, [previewResults, filters.yearFrom, filters.yearTo]);

  const minYear = publishYears.length > 0 ? publishYears[0] : undefined;
  const maxYear = publishYears.length > 0 ? publishYears[publishYears.length - 1] : undefined;

  const handleSearch = () => {
    const searchResults = searchMaterials(filters);
    setResults(searchResults);
    setHasSearched(true);
  };

  const handleReset = () => {
    setFilters({});
    setResults([]);
    setHasSearched(false);
  };

  const updateFilter = (key: keyof SearchFilters, value: SearchFilters[keyof SearchFilters]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
          高级检索
        </h1>
        <p className="text-gray-400">
          多维度筛选和检索您的资料收藏
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-serif text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Search className="w-5 h-5 text-accent-500" />
          筛选条件
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <BookMarked className="w-4 h-4" />
              作品
            </label>
            <select
              value={filters.work || ''}
              onChange={(e) => updateFilter('work', e.target.value || undefined)}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部作品</option>
              {availableWorks.map((work) => (
                <option key={work} value={work}>
                  {work}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <FileText className="w-4 h-4" />
              资料类型
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) =>
                updateFilter('type', (e.target.value as MaterialType) || undefined)
              }
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部类型</option>
              {availableTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <ScanLine className="w-4 h-4" />
              扫描状态
            </label>
            <select
              value={filters.scanStatus || ''}
              onChange={(e) =>
                updateFilter('scanStatus', (e.target.value as ScanStatus) || undefined)
              }
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部状态</option>
              {availableScanStatuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Users className="w-4 h-4" />
              角色
            </label>
            <select
              value={filters.characterId || ''}
              onChange={(e) =>
                updateFilter('characterId', e.target.value || undefined)
              }
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部角色</option>
              {availableCharacters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} ({char.work})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <User className="w-4 h-4" />
              制作人员
            </label>
            <select
              value={filters.staffId || ''}
              onChange={(e) =>
                updateFilter('staffId', e.target.value || undefined)
              }
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部人员</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Palette className="w-4 h-4" />
              职务（原画师等）
            </label>
            <select
              value={filters.staffRole || ''}
              onChange={(e) =>
                updateFilter('staffRole', e.target.value || undefined)
              }
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white input-focus"
            >
              <option value="">全部职务</option>
              {availableStaffRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4" />
              起始年份
            </label>
            <input
              type="number"
              value={filters.yearFrom || ''}
              onChange={(e) =>
                updateFilter('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder={minYear ? `最早 ${minYear}` : '年份'}
              min={minYear}
              max={maxYear}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4" />
              结束年份
            </label>
            <input
              type="number"
              value={filters.yearTo || ''}
              onChange={(e) =>
                updateFilter('yearTo', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder={maxYear ? `最晚 ${maxYear}` : '年份'}
              min={minYear}
              max={maxYear}
              className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
            />
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Search className="w-4 h-4" />
            关键词搜索
          </label>
          <input
            type="text"
            value={filters.keyword || ''}
            onChange={(e) => updateFilter('keyword', e.target.value || undefined)}
            placeholder="搜索标题、作品、描述等内容..."
            className="w-full px-4 py-3 rounded-lg bg-primary-800/50 border border-accent-500/20 text-white placeholder-gray-500 input-focus"
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleReset}
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
            执行检索
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-white">
              检索结果 <span className="text-accent-400">({results.length})</span>
            </h2>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onView={(m) => setViewingMaterial(m)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass rounded-xl">
              <Search className="w-12 h-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">未找到匹配的资料</h3>
              <p className="text-gray-400">尝试调整筛选条件后重新检索</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={!!viewingMaterial}
        onClose={() => setViewingMaterial(null)}
        title="资料详情"
        size="lg"
      >
        {viewingMaterial && <MaterialDetail material={viewingMaterial} />}
      </Modal>
    </div>
  );
}
