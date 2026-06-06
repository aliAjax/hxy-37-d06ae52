import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, Library, Users, ScanLine, Clock, Star } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Material } from '../types';

interface WorkStats {
  name: string;
  materials: Material[];
  materialCount: number;
  characterCount: number;
  staffCount: number;
  scanStatus: {
    unscanned: number;
    partial: number;
    completed: number;
  };
  scanProgress: number;
  latestMaterial: Material | null;
  latestUpdate: string;
  isFavorite: boolean;
  notes: string;
}

export function WorkArchive() {
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const workInfos = useStore((state) => state.workInfos);
  const setWorkFavorite = useStore((state) => state.setWorkFavorite);

  const workStats = useMemo(() => {
    const workMap = new Map<string, Material[]>();

    materials.forEach((material) => {
      const workName = material.work || '未分类作品';
      if (!workMap.has(workName)) {
        workMap.set(workName, []);
      }
      workMap.get(workName)!.push(material);
    });

    const stats: WorkStats[] = [];

    workMap.forEach((workMaterials, workName) => {
      const workCharacterIds = new Set<string>();
      const workStaffIdsFromMaterials = new Set<string>();
      const workStaffIdsFromPageRefs = new Set<string>();
      const workStaffIdsFromWorks = new Set<string>();

      workMaterials.forEach((m) => {
        m.characterIds.forEach((id) => workCharacterIds.add(id));
        m.staffIds.forEach((id) => workStaffIdsFromMaterials.add(id));
        m.pageReferences.forEach((pr) => {
          pr.staffIds.forEach((id) => workStaffIdsFromPageRefs.add(id));
        });
      });

      staff.forEach((s) => {
        if (s.works && s.works.some((w) => w.includes(workName) || workName.includes(w))) {
          workStaffIdsFromWorks.add(s.id);
        }
      });

      const allWorkStaffIds = new Set([
        ...workStaffIdsFromMaterials,
        ...workStaffIdsFromPageRefs,
        ...workStaffIdsFromWorks,
      ]);

      const scanStatus = {
        unscanned: 0,
        partial: 0,
        completed: 0,
      };

      workMaterials.forEach((m) => {
        scanStatus[m.scanStatus]++;
      });

      const totalMaterials = workMaterials.length;
      const scanProgress = totalMaterials > 0
        ? Math.round((scanStatus.completed / totalMaterials) * 100)
        : 0;

      const latestMaterial = [...workMaterials].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      stats.push({
        name: workName,
        materials: workMaterials,
        materialCount: totalMaterials,
        characterCount: workCharacterIds.size,
        staffCount: allWorkStaffIds.size,
        scanStatus,
        scanProgress,
        latestMaterial: latestMaterial || null,
        latestUpdate: latestMaterial?.updatedAt || '',
        isFavorite: workInfos[workName]?.isFavorite || false,
        notes: workInfos[workName]?.notes || '',
      });
    });

    return stats.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime();
    });
  }, [materials, staff, workInfos]);

  const getScanProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const overallStats = useMemo(() => {
    const totalMaterials = materials.length;
    const totalWorks = workStats.length;
    const totalCharacters = characters.length;
    const totalStaff = staff.length;
    const completedScans = materials.filter((m) => m.scanStatus === 'completed').length;
    const overallProgress = totalMaterials > 0
      ? Math.round((completedScans / totalMaterials) * 100)
      : 0;

    return {
      totalMaterials,
      totalWorks,
      totalCharacters,
      totalStaff,
      overallProgress,
    };
  }, [materials, characters, staff, workStats]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            作品档案
          </h1>
          <p className="text-gray-400">
            按作品维度聚合展示所有收藏资料
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <BookMarked className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallStats.totalWorks}</div>
              <div className="text-sm text-gray-400">作品总数</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent-500/20">
              <Library className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallStats.totalMaterials}</div>
              <div className="text-sm text-gray-400">资料总数</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallStats.totalCharacters}</div>
              <div className="text-sm text-gray-400">角色总数</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <ScanLine className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{overallStats.overallProgress}%</div>
              <div className="text-sm text-gray-400">扫描完成率</div>
            </div>
          </div>
        </div>
      </div>

      {workStats.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookMarked className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            暂无作品数据
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            添加资料时指定作品名称，即可在此处按作品维度查看聚合数据。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workStats.map((work) => (
            <Link
              key={work.name}
              to={`/works/${encodeURIComponent(work.name)}`}
              className={`glass rounded-xl overflow-hidden card-hover group animate-fade-in relative ${work.isFavorite ? 'ring-2 ring-yellow-500/50' : ''}`}
            >
              {work.isFavorite && (
                <div className="absolute top-3 right-3 z-10">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-500/20">
                      <BookMarked className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-white group-hover:text-accent-400 transition-colors">
                        {work.name}
                      </h3>
                      {work.isFavorite && (
                        <span className="text-xs text-yellow-400 font-medium">重点作品</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setWorkFavorite(work.name, !work.isFavorite);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${work.isFavorite ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'}`}
                    title={work.isFavorite ? '取消重点' : '设为重点'}
                  >
                    <Star className={`w-4 h-4 ${work.isFavorite ? 'fill-yellow-400' : ''}`} />
                  </button>
                </div>

                {work.notes && (
                  <div className="mb-4 p-3 rounded-lg bg-primary-800/50 border-l-2 border-accent-500">
                    <p className="text-sm text-gray-300 line-clamp-2">{work.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent-400">{work.materialCount}</div>
                    <div className="text-xs text-gray-500">资料</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{work.characterCount}</div>
                    <div className="text-xs text-gray-500">角色</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{work.staffCount}</div>
                    <div className="text-xs text-gray-500">制作人员</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <ScanLine className="w-4 h-4" />
                      扫描进度
                    </span>
                    <span className="text-sm font-medium text-white">{work.scanProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary-800 overflow-hidden">
                    <div
                      className={`h-full ${getScanProgressColor(work.scanProgress)} rounded-full transition-all duration-500`}
                      style={{ width: `${work.scanProgress}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      未扫描 {work.scanStatus.unscanned}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      部分 {work.scanStatus.partial}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      完成 {work.scanStatus.completed}
                    </span>
                  </div>
                </div>

                {work.latestMaterial && (
                  <div className="pt-4 border-t border-accent-500/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      最近更新资料
                    </div>
                    <div className="text-sm text-white truncate">
                      {work.latestMaterial.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(work.latestMaterial.updatedAt)}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
