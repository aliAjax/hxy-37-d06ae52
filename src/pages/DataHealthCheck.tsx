import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Tags,
  Wrench,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  runAllHealthChecks,
  getHealthStats,
  HealthIssueGroup,
  HealthIssue,
  FixPreview,
  generateFixPreview,
  executeFixes,
  HealthIssueType,
} from '../utils/healthCheck';
import { Material } from '../types';
import { Modal } from '../components/Modal';
import { MaterialForm } from '../components/MaterialForm';

const fixableIssueTypes: HealthIssueType[] = [
  'missing_work',
  'invalid_page_range',
  'scan_status_mismatch',
  'character_no_work',
];

export function DataHealthCheck() {
  const navigate = useNavigate();
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const updateMaterial = useStore((state) => state.updateMaterial);
  const updateCharacter = useStore((state) => state.updateCharacter);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixPreview, setFixPreview] = useState<FixPreview | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [fixSuccess, setFixSuccess] = useState<{ fixed: number; skipped: number } | null>(null);

  const issueGroups = useMemo(() => {
    return runAllHealthChecks(materials, characters, staff);
  }, [materials, characters, staff]);

  const stats = useMemo(() => {
    return getHealthStats(issueGroups);
  }, [issueGroups]);

  const toggleGroup = (groupType: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupType)) {
        next.delete(groupType);
      } else {
        next.add(groupType);
      }
      return next;
    });
  };

  const handleEditMaterial = (issue: HealthIssue) => {
    if (issue.entityType === 'material') {
      const material = materials.find((m) => m.id === issue.entityId);
      if (material) {
        setEditingMaterial(material);
        setShowEditModal(true);
      }
    }
  };

  const handleGoToTags = () => {
    navigate('/tags');
  };

  const handleSubmit = (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingMaterial) {
      updateMaterial(editingMaterial.id, data);
    }
    setShowEditModal(false);
    setEditingMaterial(null);
  };

  const handleOpenFixModal = (groupType: string) => {
    const preview = generateFixPreview(
      groupType as HealthIssueType,
      materials,
      characters
    );
    if (preview) {
      setFixPreview(preview);
      setManualInput('');
      setFixSuccess(null);
      setShowFixModal(true);
    }
  };

  const handleCloseFixModal = () => {
    setShowFixModal(false);
    setFixPreview(null);
    setManualInput('');
    setFixSuccess(null);
  };

  const handleExecuteFix = () => {
    if (!fixPreview) return;

    const result = executeFixes(
      fixPreview.type,
      materials,
      characters,
      manualInput
    );

    result.materialUpdates.forEach(({ id, updates }) => {
      updateMaterial(id, updates);
    });

    result.characterUpdates.forEach(({ id, updates }) => {
      updateCharacter(id, updates);
    });

    setFixSuccess({ fixed: result.fixedCount, skipped: result.skippedCount });
  };

  const isFixableType = (type: string): boolean => {
    return fixableIssueTypes.includes(type as HealthIssueType);
  };

  const getSeverityColor = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 'text-red-400' : 'text-yellow-400';
  };

  const getSeverityBorder = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 'border-red-500/30' : 'border-yellow-500/30';
  };

  const renderIssueItem = (issue: HealthIssue) => {
    return (
      <div
        key={issue.id}
        className={`p-4 rounded-lg bg-primary-800/30 border ${getSeverityBorder(issue.severity)} hover:bg-primary-800/50 transition-colors`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {issue.severity === 'error' ? (
                <AlertCircle className={`w-4 h-4 ${getSeverityColor(issue.severity)} flex-shrink-0`} />
              ) : (
                <AlertTriangle className={`w-4 h-4 ${getSeverityColor(issue.severity)} flex-shrink-0`} />
              )}
              <span className={`text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                {issue.title}
              </span>
            </div>
            <p className="text-gray-300 text-sm">{issue.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {issue.entityType === 'material' ? '资料' : issue.entityType === 'character' ? '角色' : '制作人员'}：
              </span>
              <span className="text-xs text-accent-400 font-medium">
                {issue.entityName}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {issue.fixAction === 'edit_material' ? (
              <button
                onClick={() => handleEditMaterial(issue)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors text-sm"
              >
                <Edit2 className="w-4 h-4" />
                编辑资料
              </button>
            ) : (
              <button
                onClick={handleGoToTags}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors text-sm"
              >
                <Tags className="w-4 h-4" />
                去标签管理
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroup = (group: HealthIssueGroup) => {
    const isExpanded = expandedGroups.has(group.type);
    const hasErrors = group.issues.some((i) => i.severity === 'error');
    const canFix = isFixableType(group.type);

    return (
      <div
        key={group.type}
        className={`glass rounded-xl overflow-hidden border ${hasErrors ? 'border-red-500/20' : 'border-yellow-500/20'}`}
      >
        <div className="p-4 flex items-center justify-between hover:bg-primary-700/30 transition-colors">
          <button
            onClick={() => toggleGroup(group.type)}
            className="flex-1 flex items-center gap-4 text-left"
          >
            <div className={`p-3 rounded-lg ${hasErrors ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <span className="text-2xl">{group.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white flex items-center gap-2">
                {group.title}
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary-700/50 text-gray-300">
                  {group.issues.length} 项
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{group.description}</p>
            </div>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <div className="flex items-center gap-1 text-sm">
              {group.issues.filter((i) => i.severity === 'error').length > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {group.issues.filter((i) => i.severity === 'error').length}
                </span>
              )}
              {group.issues.filter((i) => i.severity === 'warning').length > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  {group.issues.filter((i) => i.severity === 'warning').length}
                </span>
              )}
            </div>
            {canFix && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenFixModal(group.type);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
              >
                <Wrench className="w-4 h-4" />
                一键修复
              </button>
            )}
            <button
              onClick={() => toggleGroup(group.type)}
              className="p-1 rounded-lg hover:bg-primary-600/50 text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-accent-500/10">
            <div className="pt-4 space-y-3">
              {group.issues.map((issue) => renderIssueItem(issue))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold gradient-text mb-2">
            数据健康检查
          </h1>
          <p className="text-gray-400">
            自动扫描收藏数据中的问题，帮助您维护数据完整性
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-accent-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-accent-500/20">
              <Activity className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">待处理问题</p>
              <p className="text-2xl font-bold text-white">{stats.totalIssues}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500/20">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">严重错误</p>
              <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">警告</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.warnings}</p>
            </div>
          </div>
        </div>
      </div>

      {issueGroups.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            数据状态良好
          </h2>
          <p className="text-gray-400">
            所有数据均已通过检查，未发现任何问题
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issueGroups.map((group) => renderGroup(group))}
        </div>
      )}

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMaterial(null);
        }}
        title="编辑资料"
        size="xl"
      >
        <MaterialForm
          initialData={editingMaterial || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowEditModal(false);
            setEditingMaterial(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showFixModal}
        onClose={handleCloseFixModal}
        title={fixPreview ? `修复：${fixPreview.title}` : '一键修复'}
        size="lg"
        footer={
          fixSuccess ? (
            <div className="flex justify-end">
              <button
                onClick={handleCloseFixModal}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors"
              >
                完成
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseFixModal}
                className="px-4 py-2 rounded-lg bg-primary-600 text-gray-300 hover:bg-primary-500 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExecuteFix}
                disabled={fixPreview?.requiresInput && !manualInput.trim()}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                确认修复
              </button>
            </div>
          )
        }
      >
        {fixPreview && !fixSuccess && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary-800/50 border border-accent-500/20">
              <div className="p-3 rounded-lg bg-green-500/20">
                <Wrench className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">本次修复涉及</p>
                <p className="text-xl font-bold text-white">
                  {fixPreview.totalCount} 项记录
                </p>
              </div>
              <div className="text-right">
                {fixPreview.autoFixCount > 0 && (
                  <p className="text-sm text-green-400">
                    自动推断 {fixPreview.autoFixCount} 项
                  </p>
                )}
                {fixPreview.manualFixCount > 0 && (
                  <p className="text-sm text-yellow-400">
                    需手动指定 {fixPreview.manualFixCount} 项
                  </p>
                )}
              </div>
            </div>

            {fixPreview.requiresInput && fixPreview.inputLabel && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  {fixPreview.inputLabel}
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={fixPreview.inputPlaceholder || '请输入'}
                  className="w-full px-4 py-2.5 rounded-lg bg-primary-700/50 border border-accent-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-accent-400 transition-colors"
                />
                <p className="text-xs text-gray-500">
                  填写后将应用于所有无法自动推断的记录
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">变更预览</h4>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                {fixPreview.changes.map((change, index) => (
                  <div
                    key={`${change.entityId}-${change.field}-${index}`}
                    className={`p-3 rounded-lg border ${
                      change.autoDetermined
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-yellow-500/10 border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {change.entityName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {change.entityType === 'material'
                            ? '资料'
                            : change.entityType === 'character'
                            ? '角色'
                            : '制作人员'}
                          · {change.fieldLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-gray-400 line-through">
                          {String(change.oldValue)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span
                          className={`text-sm font-medium ${
                            change.autoDetermined
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }`}
                        >
                          {String(change.newValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-800/30 border border-primary-700/50">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                修复操作将直接修改数据，请确认后执行。无法自动判断的项目将保持原样，不会强行修改。
              </p>
            </div>
          </div>
        )}

        {fixSuccess && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">修复完成</h3>
            <p className="text-gray-400 mb-4">
              已成功修复 <span className="text-green-400 font-medium">{fixSuccess.fixed}</span> 项问题
              {fixSuccess.skipped > 0 && (
                <>
                  ，<span className="text-yellow-400 font-medium">{fixSuccess.skipped}</span> 项因无法判断已跳过
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
