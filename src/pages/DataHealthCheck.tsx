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
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  runAllHealthChecks,
  getHealthStats,
  HealthIssueGroup,
  HealthIssue,
} from '../utils/healthCheck';
import { Material } from '../types';
import { Modal } from '../components/Modal';
import { MaterialForm } from '../components/MaterialForm';

export function DataHealthCheck() {
  const navigate = useNavigate();
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const updateMaterial = useStore((state) => state.updateMaterial);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

    return (
      <div
        key={group.type}
        className={`glass rounded-xl overflow-hidden border ${hasErrors ? 'border-red-500/20' : 'border-yellow-500/20'}`}
      >
        <button
          onClick={() => toggleGroup(group.type)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary-700/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${hasErrors ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <span className="text-2xl">{group.icon}</span>
            </div>
            <div className="text-left">
              <h3 className="font-medium text-white flex items-center gap-2">
                {group.title}
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary-700/50 text-gray-300">
                  {group.issues.length} 项
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{group.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

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
    </div>
  );
}
