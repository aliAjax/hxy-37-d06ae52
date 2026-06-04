import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Users, User, BookMarked, ScanLine, Plus, Download, Database } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MaterialTypeLabels, ScanStatusLabels, MaterialType, ScanStatus } from '../types';

export function Dashboard() {
  const getStats = useStore((state) => state.getStats);
  const materials = useStore((state) => state.materials);
  const initializeWithSampleData = useStore((state) => state.initializeWithSampleData);
  const [showWelcome, setShowWelcome] = useState(false);

  const stats = getStats();
  const recentMaterials = materials.slice(0, 6);

  useEffect(() => {
    if (materials.length === 0) {
      setShowWelcome(true);
    }
  }, [materials.length]);

  const typeIcons: Record<MaterialType, string> = {
    artbook: '🎨',
    storyboard: '📝',
    setting: '📋',
    magazine: '📰',
    special: '✨',
  };

  const scanColors: Record<ScanStatus, string> = {
    unscanned: 'bg-gray-500',
    partial: 'bg-yellow-500',
    completed: 'bg-green-500',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
            欢迎回来
          </h1>
          <p className="text-gray-400">
            这是您的动画设定资料收藏概览
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/materials"
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-secondary text-white transition-all"
          >
            <Plus className="w-4 h-4" />
            添加资料
          </Link>
          <Link
            to="/import-export"
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-primary-900 font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            导入导出
          </Link>
        </div>
      </div>

      {showWelcome && (
        <div className="glass rounded-2xl p-8 text-center">
          <Database className="w-16 h-16 mx-auto text-accent-500 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-white mb-2">
            开始您的资料收藏之旅
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            您还没有添加任何资料。可以手动添加资料，或者加载示例数据来体验系统功能。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/materials"
              className="px-6 py-3 rounded-lg btn-secondary text-white font-medium"
            >
              手动添加
            </Link>
            <button
              onClick={() => {
                initializeWithSampleData();
                setShowWelcome(false);
              }}
              className="px-6 py-3 rounded-lg btn-primary text-primary-900 font-medium"
            >
              加载示例数据
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent-500/20">
              <Library className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalMaterials}</div>
              <div className="text-sm text-gray-400">资料总数</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <BookMarked className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalWorks}</div>
              <div className="text-sm text-gray-400">作品数量</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalCharacters}</div>
              <div className="text-sm text-gray-400">角色数量</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <User className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalStaff}</div>
              <div className="text-sm text-gray-400">制作人员</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-xl p-6">
          <h2 className="font-serif text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Library className="w-5 h-5 text-accent-500" />
            资料类型分布
          </h2>
          <div className="space-y-4">
            {(Object.entries(stats.byType) as [MaterialType, number][]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-4">
                <span className="text-2xl">{typeIcons[type]}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">{MaterialTypeLabels[type]}</span>
                    <span className="text-accent-400 font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalMaterials
                          ? `${(count / stats.totalMaterials) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-serif text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-accent-500" />
            扫描状态
          </h2>
          <div className="space-y-4">
            {(Object.entries(stats.scannedStatus) as [ScanStatus, number][]).map(
              ([status, count]) => (
                <div key={status} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${scanColors[status]}`} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">{ScanStatusLabels[status]}</span>
                      <span className="text-accent-400 font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-primary-800 overflow-hidden">
                      <div
                        className={`h-full ${scanColors[status]} rounded-full transition-all duration-500`}
                        style={{
                          width: stats.totalMaterials
                            ? `${(count / stats.totalMaterials) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {recentMaterials.length > 0 && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-accent-500" />
              最近添加
            </h2>
            <Link
              to="/materials"
              className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
            >
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMaterials.map((material) => (
              <Link
                key={material.id}
                to="/materials"
                className="p-4 rounded-lg bg-primary-800/30 hover:bg-primary-700/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeIcons[material.type]}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-accent-400 transition-colors truncate">
                      {material.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {material.work || '未指定作品'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
