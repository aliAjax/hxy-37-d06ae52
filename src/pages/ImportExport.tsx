import { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseCSV, downloadCSV } from '../utils/csv';
import { CSVRow, RowValidationResult } from '../types';
import { ImportPreflight } from '../components/ImportPreflight';

export function ImportExport() {
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const importFromPreflight = useStore((state) => state.importFromPreflight);
  const exportToCSV = useStore((state) => state.exportToCSV);
  const clearAllData = useStore((state) => state.clearAllData);

  const [rawData, setRawData] = useState<CSVRow[] | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    skipped: number;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);
      const validData = data.filter((row: CSVRow) => {
        const hasContent = Object.values(row).some((v) => String(v || '').trim());
        return hasContent;
      });
      setRawData(validData);
      setShowPreflight(true);
      setImportResult(null);
    } catch (error) {
      console.error('Parse error:', error);
    }
  };

  const handlePreflightConfirm = (validRows: RowValidationResult[]) => {
    const result = importFromPreflight(validRows);
    setImportResult(result);
    setShowPreflight(false);
    setRawData(null);
  };

  const handlePreflightCancel = () => {
    setShowPreflight(false);
    setRawData(null);
  };

  const handleExport = () => {
    const csv = exportToCSV();
    const filename = `资料档案_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  if (showPreflight && rawData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={handlePreflightCancel}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回导入页面
        </button>
        <div className="glass rounded-2xl p-6">
          <ImportPreflight
            rawData={rawData}
            existingMaterials={materials}
            existingCharacters={characters}
            existingStaff={staff}
            onConfirm={handlePreflightConfirm}
            onCancel={handlePreflightCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
          导入导出
        </h1>
        <p className="text-gray-400">
          批量管理您的资料数据
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Upload className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-white">导入数据</h2>
              <p className="text-sm text-gray-400">从 CSV 文件批量导入资料</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-accent-500/30 rounded-xl p-8 text-center hover:border-accent-500/50 transition-colors">
              <FileText className="w-12 h-12 mx-auto text-accent-500 mb-4" />
              <p className="text-white mb-2">拖放 CSV 文件到此处</p>
              <p className="text-gray-400 text-sm mb-4">或点击选择文件</p>
              <label className="inline-flex items-center gap-2 px-5 py-2 rounded-lg btn-secondary text-white cursor-pointer">
                <Upload className="w-4 h-4" />
                选择文件
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/20">
              <h3 className="text-white font-medium mb-2">导入流程</h3>
              <ol className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center flex-shrink-0 text-xs">1</span>
                  上传 CSV 文件，进入字段映射页面
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center flex-shrink-0 text-xs">2</span>
                  配置 CSV 表头与系统字段的映射关系
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center flex-shrink-0 text-xs">3</span>
                  执行预检，查看校验结果和重复风险
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center flex-shrink-0 text-xs">4</span>
                  确认后写入数据，失败行可单独导出
                </li>
              </ol>
            </div>

            {importResult && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="font-medium text-white">导入完成</h3>
                    <p className="text-sm text-gray-400">
                      成功导入 {importResult.success} 条资料
                      {importResult.skipped > 0 && `，跳过 ${importResult.skipped} 条`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-white">导出数据</h2>
              <p className="text-sm text-gray-400">将资料导出为 CSV 文件</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-primary-800/50 border border-accent-500/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white">待导出数据</span>
                <span className="text-accent-400 font-medium">{materials.length} 条资料</span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>• 包含所有字段信息</div>
                <div>• UTF-8 编码，支持 Excel 打开</div>
                <div>• 包含角色和制作人员关联</div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={materials.length === 0}
              className="w-full py-3 rounded-lg btn-primary text-primary-900 font-medium disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                导出全部资料
              </span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-accent-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">危险操作</h3>
                <p className="text-sm text-gray-400">清除所有数据</p>
              </div>
            </div>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
              >
                清除所有数据
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-white mb-4 text-sm">
                  确定要清除所有数据吗？此操作无法撤销。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 rounded-lg btn-secondary text-white text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
                  >
                    确认清除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-serif text-xl font-bold text-white mb-4">CSV 格式说明</h2>
        <div className="text-gray-300 text-sm space-y-2">
          <p>导入的 CSV 文件应包含以下列（第一行为表头）：</p>
          <div className="overflow-x-auto">
            <table className="w-full mt-3">
              <thead className="bg-primary-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-accent-400">列名</th>
                  <th className="px-4 py-2 text-left text-accent-400">说明</th>
                  <th className="px-4 py-2 text-left text-accent-400">示例</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-500/10">
                <tr>
                  <td className="px-4 py-2 font-mono">标题</td>
                  <td className="px-4 py-2">资料标题（必填）</td>
                  <td className="px-4 py-2 text-gray-400">新世纪福音战士 原画集</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">类型</td>
                  <td className="px-4 py-2">资料类型</td>
                  <td className="px-4 py-2 text-gray-400">原画集/分镜集/设定集/杂志切页/特典册</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">作品</td>
                  <td className="px-4 py-2">所属作品名称</td>
                  <td className="px-4 py-2 text-gray-400">新世纪福音战士</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">出版社</td>
                  <td className="px-4 py-2">出版单位</td>
                  <td className="px-4 py-2 text-gray-400">角川书店</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">出版日期</td>
                  <td className="px-4 py-2">出版日期</td>
                  <td className="px-4 py-2 text-gray-400">1996-03-01</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">总页数</td>
                  <td className="px-4 py-2">页码数量</td>
                  <td className="px-4 py-2 text-gray-400">128</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">起始页码</td>
                  <td className="px-4 py-2">收录起始页码（默认1）</td>
                  <td className="px-4 py-2 text-gray-400">1</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">结束页码</td>
                  <td className="px-4 py-2">收录结束页码（默认总页数）</td>
                  <td className="px-4 py-2 text-gray-400">128</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">购买来源</td>
                  <td className="px-4 py-2">获取渠道</td>
                  <td className="px-4 py-2 text-gray-400">日亚海淘</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">扫描状态</td>
                  <td className="px-4 py-2">扫描进度</td>
                  <td className="px-4 py-2 text-gray-400">未扫描/部分扫描/已完成</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">版权备注</td>
                  <td className="px-4 py-2">版权信息</td>
                  <td className="px-4 py-2 text-gray-400">© GAINAX</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">收录内容</td>
                  <td className="px-4 py-2">内容描述</td>
                  <td className="px-4 py-2 text-gray-400">收录TV版第1-8话原画</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">关联角色</td>
                  <td className="px-4 py-2">分号分隔</td>
                  <td className="px-4 py-2 text-gray-400">明日香; 绫波丽</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">关联制作人员</td>
                  <td className="px-4 py-2">分号分隔</td>
                  <td className="px-4 py-2 text-gray-400">庵野秀明; 贞本义行</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
