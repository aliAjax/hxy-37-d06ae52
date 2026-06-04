import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  Library,
  Users,
  User,
  ScanLine,
  Calendar,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  Material,
  Character,
  Staff,
  PageReference,
  MaterialTypeLabels,
  ScanStatusLabels,
} from '../types';

type TabType = 'materials' | 'characters' | 'staff' | 'pages';

interface TabItem {
  id: TabType;
  label: string;
  icon: typeof Library;
  count: number;
}

interface MaterialWithRelations extends Material {
  characters: Character[];
  staff: Staff[];
}

type StaffSource = 'material' | 'pageRef' | 'works' | 'multiple';

interface StaffWithSource extends Staff {
  source: StaffSource;
  relatedMaterialCount: number;
  pageRefCount: number;
}

interface PageReferenceWithDetails extends PageReference {
  materialId: string;
  materialTitle: string;
  characters: Character[];
  staff: Staff[];
}

interface PageRefCharacterStats {
  character: Character;
  pageRefCount: number;
  pageReferences: PageReferenceWithDetails[];
}

interface PageRefStaffStats {
  staff: Staff;
  pageRefCount: number;
  pageReferences: PageReferenceWithDetails[];
}

export function WorkDetail() {
  const { workName } = useParams<{ workName: string }>();
  const decodedWorkName = decodeURIComponent(workName || '');

  const materials = useStore((state) => state.materials);
  const allCharacters = useStore((state) => state.characters);
  const allStaff = useStore((state) => state.staff);

  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('materials');

  const workData = useMemo(() => {
    const workMaterials = materials.filter(
      (m) => (m.work || '未分类作品') === decodedWorkName
    );

    const workCharacterIds = new Set<string>();
    const workStaffIdsFromMaterials = new Set<string>();
    const workStaffIdsFromPageRefs = new Set<string>();
    const workStaffIdsFromWorks = new Set<string>();
    const allPageReferences: Array<PageReference & { materialId: string; materialTitle: string }> = [];

    const staffMaterialCount: Record<string, number> = {};
    const staffPageRefCount: Record<string, number> = {};

    workMaterials.forEach((m) => {
      m.characterIds.forEach((id) => workCharacterIds.add(id));
      m.staffIds.forEach((id) => {
        workStaffIdsFromMaterials.add(id);
        staffMaterialCount[id] = (staffMaterialCount[id] || 0) + 1;
      });
      m.pageReferences.forEach((pr) => {
        allPageReferences.push({
          ...pr,
          materialId: m.id,
          materialTitle: m.title,
        });
        pr.staffIds.forEach((id) => {
          workStaffIdsFromPageRefs.add(id);
          staffPageRefCount[id] = (staffPageRefCount[id] || 0) + 1;
        });
      });
    });

    allStaff.forEach((s) => {
      if (s.works && s.works.some((w) => w.includes(decodedWorkName) || decodedWorkName.includes(w))) {
        workStaffIdsFromWorks.add(s.id);
        if (!staffMaterialCount[s.id]) {
          staffMaterialCount[s.id] = 0;
        }
        if (!staffPageRefCount[s.id]) {
          staffPageRefCount[s.id] = 0;
        }
      }
    });

    const allWorkStaffIds = new Set([
      ...workStaffIdsFromMaterials,
      ...workStaffIdsFromPageRefs,
      ...workStaffIdsFromWorks,
    ]);

    const workCharacters = allCharacters.filter((c) => workCharacterIds.has(c.id));
    const workStaff: StaffWithSource[] = allStaff
      .filter((s) => allWorkStaffIds.has(s.id))
      .map((s) => {
        const fromMaterial = workStaffIdsFromMaterials.has(s.id);
        const fromPageRef = workStaffIdsFromPageRefs.has(s.id);
        const fromWorks = workStaffIdsFromWorks.has(s.id);
        const sources = [];
        if (fromMaterial) sources.push('material');
        if (fromPageRef) sources.push('pageRef');
        if (fromWorks) sources.push('works');

        let source: StaffSource = 'material';
        if (sources.length > 1) {
          source = 'multiple';
        } else if (sources.length === 1) {
          source = sources[0] as StaffSource;
        }

        return {
          ...s,
          source,
          relatedMaterialCount: staffMaterialCount[s.id] || 0,
          pageRefCount: staffPageRefCount[s.id] || 0,
        };
      });

    const materialsWithRelations: MaterialWithRelations[] = workMaterials.map((m) => ({
      ...m,
      characters: m.characterIds
        .map((id) => allCharacters.find((c) => c.id === id))
        .filter(Boolean) as Character[],
      staff: m.staffIds
        .map((id) => allStaff.find((s) => s.id === id))
        .filter(Boolean) as Staff[],
    }));

    const scanStatus = {
      unscanned: workMaterials.filter((m) => m.scanStatus === 'unscanned').length,
      partial: workMaterials.filter((m) => m.scanStatus === 'partial').length,
      completed: workMaterials.filter((m) => m.scanStatus === 'completed').length,
    };

    const scanProgress = workMaterials.length > 0
      ? Math.round((scanStatus.completed / workMaterials.length) * 100)
      : 0;

    const pageRefCharacterIds = new Set<string>();
    const pageRefStaffIds = new Set<string>();

    allPageReferences.forEach((pr) => {
      pr.characterIds.forEach((id) => pageRefCharacterIds.add(id));
      pr.staffIds.forEach((id) => pageRefStaffIds.add(id));
    });

    const allPageRefsWithDetails: PageReferenceWithDetails[] = allPageReferences
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((pr) => ({
        ...pr,
        characters: pr.characterIds
          .map((id) => allCharacters.find((c) => c.id === id))
          .filter(Boolean) as Character[],
        staff: pr.staffIds
          .map((id) => allStaff.find((s) => s.id === id))
          .filter(Boolean) as Staff[],
      }));

    const pageRefCharacterStats: PageRefCharacterStats[] = [];
    pageRefCharacterIds.forEach((charId) => {
      const char = allCharacters.find((c) => c.id === charId);
      if (char) {
        const relatedRefs = allPageRefsWithDetails.filter((pr) =>
          pr.characterIds.includes(charId)
        );
        pageRefCharacterStats.push({
          character: char,
          pageRefCount: relatedRefs.length,
          pageReferences: relatedRefs,
        });
      }
    });
    pageRefCharacterStats.sort((a, b) => b.pageRefCount - a.pageRefCount);

    const pageRefStaffStats: PageRefStaffStats[] = [];
    pageRefStaffIds.forEach((staffId) => {
      const s = allStaff.find((st) => st.id === staffId);
      if (s) {
        const relatedRefs = allPageRefsWithDetails.filter((pr) =>
          pr.staffIds.includes(staffId)
        );
        pageRefStaffStats.push({
          staff: s,
          pageRefCount: relatedRefs.length,
          pageReferences: relatedRefs,
        });
      }
    });
    pageRefStaffStats.sort((a, b) => b.pageRefCount - a.pageRefCount);

    return {
      name: decodedWorkName,
      materials: materialsWithRelations,
      characters: workCharacters,
      staff: workStaff,
      pageReferences: allPageRefsWithDetails,
      pageRefCharacterStats,
      pageRefStaffStats,
      pageRefCharacterCount: pageRefCharacterIds.size,
      pageRefStaffCount: pageRefStaffIds.size,
      scanStatus,
      scanProgress,
      materialCount: workMaterials.length,
      characterCount: workCharacters.length,
      staffCount: workStaff.length,
      pageReferenceCount: allPageReferences.length,
    };
  }, [decodedWorkName, materials, allCharacters, allStaff]);

  const toggleMaterial = (materialId: string) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const getScanProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

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

  const tabs: TabItem[] = [
    { id: 'materials', label: '资料列表', icon: Library, count: workData.materialCount },
    { id: 'characters', label: '角色', icon: Users, count: workData.characterCount },
    { id: 'staff', label: '制作人员', icon: User, count: workData.staffCount },
    { id: 'pages', label: '页码标注', icon: FileText, count: workData.pageReferenceCount },
  ];

  if (!decodedWorkName) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <BookMarked className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <h2 className="font-serif text-xl font-bold text-white mb-2">作品不存在</h2>
        <p className="text-gray-400 mb-6">请返回作品档案页面重新选择</p>
        <Link
          to="/works"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-primary-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回作品档案
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          to="/works"
          className="p-2 rounded-lg hover:bg-primary-700/50 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            {workData.name}
          </h1>
          <p className="text-gray-400">
            作品详情与资料汇总
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent-500/20">
              <Library className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{workData.materialCount}</div>
              <div className="text-sm text-gray-400">资料</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{workData.characterCount}</div>
              <div className="text-sm text-gray-400">角色</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <User className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{workData.staffCount}</div>
              <div className="text-sm text-gray-400">制作人员</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <ScanLine className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{workData.scanProgress}%</div>
              <div className="text-sm text-gray-400">扫描完成</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-accent-500" />
            扫描进度概览
          </h2>
        </div>
        <div className="h-3 rounded-full bg-primary-800 overflow-hidden">
          <div
            className={`h-full ${getScanProgressColor(workData.scanProgress)} rounded-full transition-all duration-500`}
            style={{ width: `${workData.scanProgress}%` }}
          />
        </div>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-sm text-gray-400">未扫描: {workData.scanStatus.unscanned}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-400">部分扫描: {workData.scanStatus.partial}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-400">已完成: {workData.scanStatus.completed}</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex border-b border-accent-500/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors
                  ${isActive
                    ? 'text-accent-400 border-b-2 border-accent-400 bg-accent-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-primary-700/30'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`
                  px-2 py-0.5 text-xs rounded-full
                  ${isActive ? 'bg-accent-500/20 text-accent-400' : 'bg-primary-700/50 text-gray-400'}
                `}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {workData.materials.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">暂无资料</p>
                </div>
              ) : (
                workData.materials.map((material) => {
                  const isExpanded = expandedMaterials.has(material.id);
                  return (
                    <div
                      key={material.id}
                      className="bg-primary-800/30 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleMaterial(material.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-primary-700/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{typeIcons[material.type]}</span>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{material.title}</h3>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400">
                                {MaterialTypeLabels[material.type]}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${scanStatusColors[material.scanStatus]}`}>
                                {ScanStatusLabels[material.scanStatus]}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {material.publishDate || '未标注'}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {material.pageCount} 页
                                {(material.pageStart > 1 || material.pageEnd < material.pageCount) && (
                                  <span className="text-accent-500">
                                    (P{material.pageStart}-P{material.pageEnd})
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {material.characters.length} 角色
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {material.staff.length} 人员
                              </span>
                              {material.pageReferences.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {material.pageReferences.length} 页码标注
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-accent-500/10">
                          <div className="pt-4 space-y-4">
                            {material.description && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">描述</h4>
                                <p className="text-sm text-gray-300">{material.description}</p>
                              </div>
                            )}

                            {material.characters.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  关联角色
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {material.characters.map((char) => (
                                    <span
                                      key={char.id}
                                      className="px-3 py-1 text-sm rounded-full bg-purple-500/20 text-purple-300"
                                    >
                                      {char.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {material.staff.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  制作人员
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {material.staff.map((s) => (
                                    <span
                                      key={s.id}
                                      className="px-3 py-1 text-sm rounded-full bg-green-500/20 text-green-300"
                                    >
                                      {s.name}
                                      <span className="text-green-400/60 ml-1">({s.role})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {material.pageReferences.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  页码标注
                                </h4>
                                <div className="space-y-2">
                                  {material.pageReferences
                                    .sort((a, b) => a.pageNumber - b.pageNumber)
                                    .map((pr) => (
                                      <div
                                        key={pr.id}
                                        className="p-3 rounded-lg bg-primary-800/50"
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="px-2 py-1 text-xs font-mono rounded bg-accent-500/20 text-accent-400 whitespace-nowrap">
                                            P{pr.pageNumber}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-300">{pr.description}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                              {pr.characterIds.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <Users className="w-3 h-3 text-purple-400" />
                                                  {pr.characterIds
                                                    .map((id) => material.characters.find((c) => c.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(', ')}
                                                </div>
                                              )}
                                              {pr.staffIds.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <User className="w-3 h-3 text-green-400" />
                                                  {pr.staffIds
                                                    .map((id) => material.staff.find((s) => s.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(', ')}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="space-y-3">
              {workData.characters.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">暂无角色数据</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workData.characters.map((char) => {
                    const charMaterials = workData.materials.filter((m) =>
                      m.characterIds.includes(char.id)
                    );
                    return (
                      <div
                        key={char.id}
                        className="p-4 rounded-lg bg-primary-800/30 hover:bg-primary-700/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <Users className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{char.name}</h4>
                            <p className="text-xs text-gray-500">
                              出现在 {charMaterials.length} 本资料中
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-3">
              {workData.staff.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">暂无制作人员数据</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      资料关联
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      页码标注
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Works字段
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-accent-500" />
                      多来源
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workData.staff.map((s) => {
                      const sourceColors: Record<StaffSource, string> = {
                        material: 'border-l-2 border-l-green-500',
                        pageRef: 'border-l-2 border-l-orange-500',
                        works: 'border-l-2 border-l-blue-500',
                        multiple: 'border-l-2 border-l-accent-500',
                      };
                      const sourceLabels: Record<StaffSource, string> = {
                        material: '资料关联',
                        pageRef: '页码标注',
                        works: 'Works字段',
                        multiple: '多来源',
                      };
                      const sourceBadgeColors: Record<StaffSource, string> = {
                        material: 'bg-green-500/20 text-green-400',
                        pageRef: 'bg-orange-500/20 text-orange-400',
                        works: 'bg-blue-500/20 text-blue-400',
                        multiple: 'bg-accent-500/20 text-accent-400',
                      };
                      return (
                        <div
                          key={s.id}
                          className={`p-4 rounded-lg bg-primary-800/30 hover:bg-primary-700/40 transition-colors ${sourceColors[s.source]}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                              <User className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-white">{s.name}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${sourceBadgeColors[s.source]}`}>
                                  {sourceLabels[s.source]}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">{s.role}</p>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                {s.relatedMaterialCount > 0 && (
                                  <span>资料: {s.relatedMaterialCount} 本</span>
                                )}
                                {s.pageRefCount > 0 && (
                                  <span>页码标注: {s.pageRefCount} 处</span>
                                )}
                                {s.works && s.works.length > 0 && (
                                  <span>Works: {s.works.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-6">
              {(workData.pageRefCharacterStats.length > 0 || workData.pageRefStaffStats.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workData.pageRefCharacterStats.length > 0 && (
                    <div className="p-4 rounded-lg bg-primary-800/30">
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        角色页码标注统计
                      </h4>
                      <div className="space-y-2">
                        {workData.pageRefCharacterStats.map((stat) => (
                          <div
                            key={stat.character.id}
                            className="flex items-center justify-between p-2 rounded bg-primary-700/30"
                          >
                            <span className="text-gray-300">{stat.character.name}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                              {stat.pageRefCount} 处标注
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workData.pageRefStaffStats.length > 0 && (
                    <div className="p-4 rounded-lg bg-primary-800/30">
                      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-green-400" />
                        制作人员页码标注统计
                      </h4>
                      <div className="space-y-2">
                        {workData.pageRefStaffStats.map((stat) => (
                          <div
                            key={stat.staff.id}
                            className="flex items-center justify-between p-2 rounded bg-primary-700/30"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-300">{stat.staff.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({stat.staff.role})</span>
                            </div>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 ml-2">
                              {stat.pageRefCount} 处标注
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-500" />
                  页码标注列表
                </h4>
                {workData.pageReferences.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">暂无页码标注</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workData.pageReferences.map((pr, index) => (
                      <div
                        key={`${pr.materialId}-${pr.id}-${index}`}
                        className="p-4 rounded-lg bg-primary-800/30 hover:bg-primary-700/40 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <span className="px-3 py-1.5 text-sm font-mono rounded-lg bg-accent-500/20 text-accent-400 whitespace-nowrap">
                            P{pr.pageNumber}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300">{pr.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              来源: {pr.materialTitle}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-2">
                              {pr.characters.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Users className="w-3 h-3 text-purple-400" />
                                  <span className="text-gray-400">
                                    {pr.characters.map((c) => c.name).join(', ')}
                                  </span>
                                </div>
                              )}
                              {pr.staff.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <User className="w-3 h-3 text-green-400" />
                                  <span className="text-gray-400">
                                    {pr.staff.map((s) => s.name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
