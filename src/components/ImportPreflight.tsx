import { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Copy,
  Users,
  UserPlus,
  Download,
  ChevronDown,
  ChevronRight,
  X,
  ArrowRight,
  RefreshCw,
  FileWarning,
  Database,
} from 'lucide-react';
import {
  FieldMapping,
  PreflightResult,
  RowValidationResult,
  ValidationStatus,
  Material,
  Character,
  Staff,
  CSVRow,
  CharacterPreview,
  StaffPreview,
} from '../types';
import {
  TARGET_FIELDS,
  autoMapFields,
  runPreflight,
  exportFailedRows,
  downloadCSV,
} from '../utils/csv';
import { useStore } from '../store/useStore';

interface ImportPreflightProps {
  rawData: CSVRow[];
  existingMaterials: Material[];
  existingCharacters: Character[];
  existingStaff: Staff[];
  onConfirm: (validRows: RowValidationResult[], stats: { skippedByUser: number; skippedByError: number }) => void;
  onCancel: () => void;
}

const statusConfig: Record<ValidationStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  success: { label: '正常', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  warning: { label: '警告', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: AlertTriangle },
  error: { label: '错误', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: AlertCircle },
  duplicate: { label: '重复风险', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: Copy },
};

type TabType = 'mapping' | 'validation' | 'entities' | 'duplicates';

export function ImportPreflight({
  rawData,
  existingMaterials,
  existingCharacters,
  existingStaff,
  onConfirm,
  onCancel,
}: ImportPreflightProps) {
  const duplicateRules = useStore((state) => state.duplicateRules);

  const csvHeaders = useMemo(() => {
    if (rawData.length === 0) return [];
    return Object.keys(rawData[0]).filter((k) => k !== '__parsed_extra');
  }, [rawData]);

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(() => autoMapFields(csvHeaders));
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('mapping');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | 'all'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleMappingChange = (csvHeader: string, targetField: string) => {
    setFieldMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, targetField } : m))
    );
    setPreflightResult(null);
  };

  const runPreflightCheck = () => {
    const result = runPreflight(
      rawData,
      fieldMappings,
      existingMaterials,
      existingCharacters,
      existingStaff,
      duplicateRules
    );
    setPreflightResult(result);
    setActiveTab('validation');
    const selectableIndices = result.rowResults
      .filter((r) => r.status !== 'error')
      .map((r) => r.rowIndex);
    setSelectedRows(new Set(selectableIndices));
  };

  const toggleRowSelect = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!preflightResult) return;
    const selectableRows = preflightResult.rowResults.filter((r) => r.status !== 'error');
    const allSelected = selectableRows.every((r) => selectedRows.has(r.rowIndex));

    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableRows.map((r) => r.rowIndex)));
    }
  };

  const toggleRowExpand = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const handleExportFailed = () => {
    if (!preflightResult) return;
    const csv = exportFailedRows(preflightResult);
    const filename = `导入失败_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const handleConfirm = () => {
    if (!preflightResult) return;
    const selectedRowResults = preflightResult.rowResults.filter(
      (r) => selectedRows.has(r.rowIndex) && r.status !== 'error'
    );
    const skippedByUser = preflightResult.rowResults.filter(
      (r) => r.status !== 'error' && !selectedRows.has(r.rowIndex)
    ).length;
    const skippedByError = preflightResult.summary.errorRows;
    onConfirm(selectedRowResults, { skippedByUser, skippedByError });
  };

  const filteredRowResults = useMemo(() => {
    if (!preflightResult) return [];
    if (statusFilter === 'all') return preflightResult.rowResults;
    return preflightResult.rowResults.filter((r) => r.status === statusFilter);
  }, [preflightResult, statusFilter]);

  const tabs: { key: TabType; label: string; icon: typeof Database }[] = [
    { key: 'mapping', label: '字段映射', icon: ArrowRight },
    { key: 'validation', label: '校验结果', icon: CheckCircle },
    { key: 'entities', label: '实体预览', icon: Users },
    { key: 'duplicates', label: '重复检测', icon: Copy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">导入预检</h2>
          <p className="text-gray-400 mt-1">共 {rawData.length} 条数据待处理</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-primary-700/50 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-accent-500/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'validation' && preflightResult && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-500/20 text-accent-400">
                  {preflightResult.summary.totalRows}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
            <p className="text-sm text-gray-300">
              将 CSV 表头映射到系统字段。系统会自动识别常见的表头名称，您可以手动调整映射关系。
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-accent-500/20">
            <table className="w-full text-sm">
              <thead className="bg-primary-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">CSV 表头</th>
                  <th className="px-4 py-3 text-center text-gray-300">映射关系</th>
                  <th className="px-4 py-3 text-left text-gray-300">目标字段</th>
                  <th className="px-4 py-3 text-left text-gray-300">示例值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-500/10">
                {fieldMappings.map((mapping) => {
                  const targetField = TARGET_FIELDS.find((f) => f.key === mapping.targetField);
                  const sampleValue = rawData[0]?.[mapping.csvHeader] ?? '';
                  return (
                    <tr key={mapping.csvHeader}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-white">{mapping.csvHeader}</span>
                        {targetField?.required && (
                          <span className="ml-2 text-xs text-red-400">*</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ArrowRight className="w-4 h-4 text-accent-500 inline" />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping.targetField}
                          onChange={(e) => handleMappingChange(mapping.csvHeader, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-primary-700/50 border border-accent-500/20 text-white focus:outline-none focus:border-accent-500"
                        >
                          <option value="">-- 不映射 --</option>
                          {TARGET_FIELDS.map((field) => (
                            <option key={field.key} value={field.key}>
                              {field.label}
                              {field.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-xs">
                        {String(sampleValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={runPreflightCheck}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              执行预检
            </button>
          </div>
        </div>
      )}

      {activeTab === 'validation' && preflightResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
              <div className="text-2xl font-bold text-white">{preflightResult.summary.totalRows}</div>
              <div className="text-sm text-gray-400">总计</div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{preflightResult.summary.validRows}</div>
              <div className="text-sm text-gray-400">正常</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-400">{preflightResult.summary.warningRows}</div>
              <div className="text-sm text-gray-400">警告</div>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">{preflightResult.summary.errorRows}</div>
              <div className="text-sm text-gray-400">错误</div>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="text-2xl font-bold text-orange-400">{preflightResult.summary.duplicateRows}</div>
              <div className="text-sm text-gray-400">重复风险</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'success', 'warning', 'error', 'duplicate'] as const).map((filter) => {
                const isAll = filter === 'all';
                const count = isAll
                  ? preflightResult.rowResults.length
                  : preflightResult.rowResults.filter((r) => r.status === filter).length;

                if (isAll) {
                  return (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        statusFilter === filter
                          ? 'bg-accent-500/20 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      全部
                      <span className="text-xs">({count})</span>
                    </button>
                  );
                }

                const config = statusConfig[filter];
                const StatusIcon = config.icon;
                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      statusFilter === filter
                        ? `${config.bgColor} ${config.color}`
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                    <span className="text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            {preflightResult.summary.errorRows > 0 && (
              <button
                onClick={handleExportFailed}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
              >
                <FileWarning className="w-4 h-4" />
                导出失败行
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-accent-500/20 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 w-10">
                    <input
                      type="checkbox"
                      checked={preflightResult ? preflightResult.rowResults.filter((r) => r.status !== 'error').every((r) => selectedRows.has(r.rowIndex)) : false}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-accent-500/30 bg-primary-700/50 text-accent-500 focus:ring-accent-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 w-12"></th>
                  <th className="px-4 py-3 text-left text-gray-300 w-16">行号</th>
                  <th className="px-4 py-3 text-left text-gray-300 w-24">状态</th>
                  <th className="px-4 py-3 text-left text-gray-300">标题</th>
                  <th className="px-4 py-3 text-left text-gray-300">作品</th>
                  <th className="px-4 py-3 text-left text-gray-300">问题</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-500/10">
                {filteredRowResults.map((row) => {
                  const config = statusConfig[row.status];
                  const StatusIcon = config.icon;
                  const isExpanded = expandedRows.has(row.rowIndex);
                  const hasIssues = row.errors.length > 0 || row.warnings.length > 0;
                  const isSelectable = row.status !== 'error';
                  const isSelected = selectedRows.has(row.rowIndex);
                  return (
                    <>
                      <tr
                        key={row.rowIndex}
                        className={`cursor-pointer hover:bg-primary-700/30 ${
                          row.status === 'error' ? 'bg-red-500/5' : ''
                        }`}
                        onClick={() => hasIssues && toggleRowExpand(row.rowIndex)}
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSelectable}
                            onChange={() => toggleRowSelect(row.rowIndex)}
                            className="w-4 h-4 rounded border-accent-500/30 bg-primary-700/50 text-accent-500 focus:ring-accent-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {hasIssues && (
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-400">{row.rowIndex + 1}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bgColor} ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-white truncate max-w-xs">
                          {row.material?.title || row.originalRow.标题 || '(无标题)'}
                        </td>
                        <td className="px-4 py-2 text-gray-400 truncate max-w-xs">
                          {row.material?.work || row.originalRow.作品 || '-'}
                        </td>
                        <td className="px-4 py-2">
                          {hasIssues ? (
                            <div className="flex gap-1">
                              {row.errors.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                  {row.errors.length} 错误
                                </span>
                              )}
                              {row.warnings.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                  {row.warnings.length} 警告
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasIssues && (
                        <tr className="bg-primary-800/30">
                          <td colSpan={7} className="px-12 py-3">
                            <div className="space-y-2">
                              {row.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-2 text-red-400 text-sm">
                                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  {err}
                                </div>
                              ))}
                              {row.warnings.map((warn, i) => (
                                <div key={i} className="flex items-start gap-2 text-yellow-400 text-sm">
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  {warn}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'entities' && preflightResult && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <UserPlus className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">角色</h3>
                <p className="text-sm text-gray-400">
                  新增 {preflightResult.summary.newCharacters.length} / 已存在 {preflightResult.summary.existingCharacters.length}
                </p>
              </div>
            </div>

            {preflightResult.summary.newCharacters.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm text-pink-400 mb-2 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  将自动创建
                </h4>
                <div className="space-y-1.5">
                  {preflightResult.summary.newCharacters.map((char: CharacterPreview) => (
                    <div
                      key={`${char.name}|${char.work}`}
                      className="px-2 py-1 rounded text-xs bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-between"
                    >
                      <span>{char.name}</span>
                      {char.work && <span className="text-pink-300 opacity-75">• {char.work}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preflightResult.summary.existingCharacters.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  已存在
                </h4>
                <div className="space-y-1.5">
                  {preflightResult.summary.existingCharacters.map((char: CharacterPreview) => (
                    <div
                      key={`${char.name}|${char.work}`}
                      className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400 flex items-center justify-between"
                    >
                      <span>{char.name}</span>
                      {char.work && <span className="opacity-75">• {char.work}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preflightResult.summary.newCharacters.length === 0 && preflightResult.summary.existingCharacters.length === 0 && (
              <p className="text-sm text-gray-500">无角色数据</p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">制作人员</h3>
                <p className="text-sm text-gray-400">
                  新增 {preflightResult.summary.newStaff.length} / 已存在 {preflightResult.summary.existingStaff.length}
                </p>
              </div>
            </div>

            {preflightResult.summary.newStaff.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm text-purple-400 mb-2 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  将自动创建
                </h4>
                <div className="space-y-1.5">
                  {preflightResult.summary.newStaff.map((s: StaffPreview) => (
                    <div
                      key={`${s.name}|${s.role}`}
                      className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="text-purple-300 opacity-75">• {s.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preflightResult.summary.existingStaff.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  已存在
                </h4>
                <div className="space-y-1.5">
                  {preflightResult.summary.existingStaff.map((s: StaffPreview) => (
                    <div
                      key={`${s.name}|${s.role}`}
                      className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400 flex items-center justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="opacity-75">• {s.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preflightResult.summary.newStaff.length === 0 && preflightResult.summary.existingStaff.length === 0 && (
              <p className="text-sm text-gray-500">无制作人员数据</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && preflightResult && (
        <div className="space-y-4">
          {preflightResult.summary.duplicateRows > 0 ? (
            <>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-400">发现潜在重复资料</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      有 {preflightResult.summary.duplicateRows} 条资料可能与现有资料重复，请确认是否继续导入
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {preflightResult.rowResults
                  .filter((r) => r.duplicateInfo)
                  .map((row) => (
                    <div
                      key={row.rowIndex}
                      className="p-4 rounded-lg bg-primary-800/30 border border-orange-500/20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{row.material?.title}</h4>
                          <p className="text-sm text-gray-400">第 {row.rowIndex + 1} 行</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                          重复风险
                        </span>
                      </div>

                      <div className="space-y-2">
                        {row.duplicateInfo?.similarMaterials.map((dup, i) => (
                          <div key={i} className="p-3 rounded-lg bg-primary-700/30">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-white text-sm">{dup.material.title}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {dup.material.work} • {dup.material.publisher}
                                </p>
                              </div>
                              <span className="text-xs text-orange-400">{dup.similarityScore}% 相似</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {dup.matchReasons.map((reason, j) => (
                                <span key={j} className="px-1.5 py-0.5 rounded text-xs bg-orange-500/10 text-orange-400">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="p-8 rounded-lg bg-primary-800/30 border border-accent-500/20 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
              <h3 className="font-medium text-white">未发现重复资料</h3>
              <p className="text-sm text-gray-400 mt-1">
                导入的数据与现有资料库没有检测到明显的重复
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-accent-500/20">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg btn-secondary text-white"
        >
          取消
        </button>

        <div className="flex items-center gap-3">
          {!preflightResult && (
            <button
              onClick={runPreflightCheck}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              执行预检
            </button>
          )}

          {preflightResult && (
            <button
              onClick={runPreflightCheck}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700/50 text-gray-300 hover:bg-primary-700 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新预检
            </button>
          )}

          {preflightResult && (
            <button
              onClick={handleConfirm}
              disabled={selectedRows.size === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg btn-primary text-primary-900 font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              确认导入 ({selectedRows.size} 条)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
