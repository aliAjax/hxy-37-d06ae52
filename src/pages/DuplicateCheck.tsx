import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Trash2,
  SkipForward,
  Copy,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Settings,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { findDuplicatePairs, getFieldDifferences, DuplicatePair, FieldDiff, DuplicateCheckRules } from '../utils/duplicateCheck';
import { Material, MaterialTypeLabels, ScanStatusLabels } from '../types';
import { Modal } from '../components/Modal';

type ActionType = 'keep' | 'delete' | 'skip';

export function DuplicateCheck() {
  const materials = useStore((state) => state.materials);
  const deleteMaterial = useStore((state) => state.deleteMaterial);
  const duplicateRules = useStore((state) => state.duplicateRules);
  const updateDuplicateRules = useStore((state) => state.updateDuplicateRules);
  const resetDuplicateRules = useStore((state) => state.resetDuplicateRules);

  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [processedPairs, setProcessedPairs] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    pair: DuplicatePair | null;
    action: ActionType;
    targetId?: string;
  }>({ isOpen: false, pair: null, action: 'skip' });

  const duplicatePairs = useMemo(() => {
    return findDuplicatePairs(materials, duplicateRules).filter(
      (pair) => !processedPairs.has(pair.id)
    );
  }, [materials, duplicateRules, processedPairs]);

  const togglePair = (pairId: string) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) {
        next.delete(pairId);
      } else {
        next.add(pairId);
      }
      return next;
    });
  };

  const openConfirmModal = (pair: DuplicatePair, action: ActionType, targetId?: string) => {
    setConfirmModal({ isOpen: true, pair, action, targetId });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, pair: null, action: 'skip' });
  };

  const handleConfirmAction = () => {
    if (!confirmModal.pair) return;

    const { pair, action, targetId } = confirmModal;

    if (action === 'delete' && targetId) {
      deleteMaterial(targetId);
    }

    setProcessedPairs((prev) => new Set([...prev, pair.id]));
    closeConfirmModal();
  };

  const handleSkip = (pair: DuplicatePair) => {
    setProcessedPairs((prev) => new Set([...prev, pair.id]));
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getSimilarityBg = (score: number) => {
    if (score >= 70) return 'bg-red-500/20';
    if (score >= 50) return 'bg-yellow-500/20';
    return 'bg-blue-500/20';
  };

  const handleWeightChange = (key: keyof DuplicateCheckRules['weights'], value: number) => {
    updateDuplicateRules({
      weights: { [key]: value },
    });
  };

  const handleThresholdChange = (key: keyof DuplicateCheckRules['thresholds'], value: number) => {
    updateDuplicateRules({
      thresholds: { [key]: value },
    });
  };

  const typeIcons = {
    artbook: '🎨',
    storyboard: '📝',
    setting: '📋',
    magazine: '📰',
    special: '✨',
  };

  const scanStatusColors = {
    unscanned: 'bg-gray-500/20 text-gray-400',
    partial: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
  };

  const renderMaterialCard = (material: Material, pair: DuplicatePair) => {
    const targetId = material.id;

    return (
      <div className="flex-1 bg-primary-800/50 rounded-xl p-4 border border-primary-700/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{typeIcons[material.type]}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white flex items-center gap-2 flex-wrap">
                {material.title}
                <span className="px-2 py-0.5 text-xs rounded-full bg-accent-500/20 text-accent-400">
                  {MaterialTypeLabels[material.type]}
                </span>
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {material.work || '未分类'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {material.publishDate || '未标注'}
                </span>
                <span>{material.pageCount} 页
                </span>
              </div>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-xs rounded-full ${scanStatusColors[material.scanStatus]}`}>
            {ScanStatusLabels[material.scanStatus]}
          </span>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => openConfirmModal(pair, 'keep', targetId)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            保留此条
          </button>
          <button
            onClick={() => openConfirmModal(pair, 'delete', targetId)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            删除此条
          </button>
        </div>
      </div>
    );
  };

  const renderDiffTable = (pair: DuplicatePair) => {
    const diffs = getFieldDifferences(pair.materialA, pair.materialB);

    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent-500/20">
              <th className="text-left py-2 px-3 text-gray-400 font-medium w-32">
                字段
              </th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                资料 A
              </th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                资料 B
              </th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((diff: FieldDiff) => (
              <tr
                key={diff.field}
                className={`border-b border-primary-700/30 ${
                  diff.isDifferent ? 'bg-red-500/5' : ''
                }`}
              >
                <td className="py-2 px-3">
                  <span className="text-gray-400">{diff.label}</span>
                </td>
                <td className={`py-2 px-3 ${
                  diff.isDifferent ? 'text-red-300' : 'text-gray-300'
                }`}>
                  {String(diff.valueA)}
                </td>
                <td className={`py-2 px-3 ${
                  diff.isDifferent ? 'text-red-300' : 'text-gray-300'
                }`}>
                  {String(diff.valueB)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const weightConfig = [
    { key: 'titleSimilarity' as const, label: '标题相似度权重', min: 0, max: 100, step: 5 },
    { key: 'workSame' as const, label: '作品相同权重', min: 0, max: 50, step: 5 },
    { key: 'publishDateSame' as const, label: '出版日期相同权重', min: 0, max: 50, step: 5 },
    { key: 'pageCountClose' as const, label: '页数接近权重', min: 0, max: 50, step: 5 },
    { key: 'characterOverlap' as const, label: '关联角色重合权重', min: 0, max: 50, step: 5 },
  ];

  const thresholdConfig = [
    { key: 'titleSimilarityMin' as const, label: '标题相似度阈值 (%)', min: 0, max: 100, step: 5 },
    { key: 'pageCountMaxDiff' as const, label: '页数最大差异 (页)', min: 0, max: 50, step: 1 },
    { key: 'characterOverlapMin' as const, label: '角色最少重合数', min: 0, max: 10, step: 1 },
    { key: 'overallMinScore' as const, label: '总体最低相似度 (%)', min: 0, max: 100, step: 5 },
    { key: 'minMatchReasons' as const, label: '最少匹配条件数', min: 1, max: 5, step: 1 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold gradient-text mb-2">
            重复资料检查
          </h1>
          <p className="text-gray-400">
            检测可能重复录入的资料，可对比差异并清理重复数据
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                : 'glass text-gray-300 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            检测规则
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-medium">
              待处理: {duplicatePairs.length} 对
            </span>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="glass rounded-xl p-6 border border-accent-500/20 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-medium text-white text-lg">检测规则配置</h3>
              <p className="text-sm text-gray-400 mt-1">
                调整检测参数，实时查看重复检测结果的变化
              </p>
            </div>
            <button
              onClick={resetDuplicateRules}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-700/50 text-gray-300 hover:text-white hover:bg-primary-700 transition-colors text-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复默认
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-accent-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-400" />
                权重配置
              </h4>
              <div className="space-y-5">
                {weightConfig.map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">{label}</label>
                      <span className="text-sm font-mono text-accent-400">
                        {duplicateRules.weights[key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={duplicateRules.weights[key]}
                      onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                      className="w-full h-2 bg-primary-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-accent-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-400" />
                阈值配置
              </h4>
              <div className="space-y-5">
                {thresholdConfig.map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">{label}</label>
                      <span className="text-sm font-mono text-accent-400">
                        {duplicateRules.thresholds[key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={duplicateRules.thresholds[key]}
                      onChange={(e) => handleThresholdChange(key, Number(e.target.value))}
                      className="w-full h-2 bg-primary-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-accent-500/10">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span>检测条件: 综合得分 ≥ {duplicateRules.thresholds.overallMinScore}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>且匹配条件 ≥ {duplicateRules.thresholds.minMatchReasons} 项</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>当前检测出 {duplicatePairs.length} 对重复</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicatePairs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            暂无重复资料
          </h2>
          <p className="text-gray-400">
            所有资料均已检查完毕，未发现疑似重复的资料
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicatePairs.map((pair) => {
            const isExpanded = expandedPairs.has(pair.id);

            return (
              <div
                key={pair.id}
                className="glass rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => togglePair(pair.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-primary-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getSimilarityBg(pair.similarityScore)}`}>
                      <Copy className={`w-6 h-6 ${getSimilarityColor(pair.similarityScore)}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-white">
                          {pair.materialA.title}
                        </h3>
                        <span className="text-gray-500">vs</span>
                        <h3 className="font-medium text-white">
                          {pair.materialB.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-sm ${getSimilarityColor(pair.similarityScore)} font-medium`}>
                          相似度: {pair.similarityScore}%
                        </span>
                        <div className="flex items-center gap-2">
                          {pair.matchReasons.map((reason, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 text-xs rounded-full bg-primary-700/50 text-gray-400"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkip(pair);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors text-sm"
                    >
                      <SkipForward className="w-4 h-4" />
                      跳过
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-accent-500/10">
                    <div className="pt-4">
                      <div className="flex gap-4 mb-4">
                        {renderMaterialCard(pair.materialA, pair)}
                        {renderMaterialCard(pair.materialB, pair)}
                      </div>

                      <div className="bg-primary-900/50 rounded-xl p-4">
                        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-accent-400" />
                          字段差异对比
                        </h4>
                        {renderDiffTable(pair)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        title={
          confirmModal.action === 'keep'
            ? '确认保留'
            : confirmModal.action === 'delete'
            ? '确认删除'
            : '确认跳过'
        }
      >
        <div className="space-y-4">
          {confirmModal.action === 'keep' && (
            <p className="text-gray-300">
          确定要保留此条资料吗？另一条资料将被标记为已处理。
            </p>
          )}
          {confirmModal.action === 'delete' && (
            <p className="text-gray-300">
          确定要删除此条资料吗？删除后将无法恢复。
            </p>
          )}
          {confirmModal.pair && (
            <div className="bg-primary-800/50 rounded-lg p-3">
              <p className="text-white font-medium">
                {confirmModal.action === 'keep'
                  ? `保留: ${confirmModal.targetId === confirmModal.pair.materialA.id
                    ? confirmModal.pair.materialA.title
                    : confirmModal.pair.materialB.title}`
                  : confirmModal.action === 'delete'
                  ? `删除: ${confirmModal.targetId === confirmModal.pair.materialA.id
                    ? confirmModal.pair.materialA.title
                    : confirmModal.pair.materialB.title}`
                  : ''}
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeConfirmModal}
              className="px-4 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmAction}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                confirmModal.action === 'delete'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-accent-500 text-primary-900 hover:bg-accent-400'
              }`}
            >
              确认
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
