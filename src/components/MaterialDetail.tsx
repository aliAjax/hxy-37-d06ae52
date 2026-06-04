import { Material, MaterialTypeLabels, ScanStatusLabels } from '../types';
import { useStore } from '../store/useStore';
import { Calendar, BookMarked, Building2, ShoppingBag, FileText, Users, User, Hash } from 'lucide-react';

interface MaterialDetailProps {
  material: Material;
}

export function MaterialDetail({ material }: MaterialDetailProps) {
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);

  const materialCharacters = material.characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  const materialStaff = material.staffIds
    .map((id) => staff.find((s) => s.id === id))
    .filter(Boolean);

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

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="text-5xl">{typeIcons[material.type]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-serif text-2xl font-bold text-white">
              {material.title}
            </h2>
            <span className="px-3 py-1 text-sm rounded-full bg-accent-500/20 text-accent-400">
              {MaterialTypeLabels[material.type]}
            </span>
            <span className={`px-3 py-1 text-sm rounded-full ${scanStatusColors[material.scanStatus]}`}>
              {ScanStatusLabels[material.scanStatus]}
            </span>
          </div>
          {material.work && (
            <div className="flex items-center gap-2 text-gray-400">
              <BookMarked className="w-4 h-4" />
              <span>{material.work}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {material.publisher && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Building2 className="w-4 h-4" />
              出版社
            </div>
            <div className="text-white font-medium">{material.publisher}</div>
          </div>
        )}

        {material.publishDate && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              出版日期
            </div>
            <div className="text-white font-medium">{material.publishDate}</div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            页数
          </div>
          <div className="text-white font-medium">{material.pageCount} 页</div>
        </div>

        {material.purchaseSource && (
          <div className="p-4 rounded-lg bg-primary-800/30">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <ShoppingBag className="w-4 h-4" />
              购买来源
            </div>
            <div className="text-white font-medium">{material.purchaseSource}</div>
          </div>
        )}
      </div>

      {material.description && (
        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="text-gray-400 text-sm mb-2">收录内容</div>
          <div className="text-white leading-relaxed">{material.description}</div>
        </div>
      )}

      {materialCharacters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Users className="w-4 h-4" />
            关联角色 ({materialCharacters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {materialCharacters.map((char) => (
              <span
                key={char!.id}
                className="px-3 py-2 rounded-lg bg-primary-700/50 text-white text-sm"
              >
                {char!.name}
                {char!.work && (
                  <span className="text-gray-400 ml-2">({char!.work})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {materialStaff.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <User className="w-4 h-4" />
            制作人员 ({materialStaff.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {materialStaff.map((s) => (
              <span
                key={s!.id}
                className="px-3 py-2 rounded-lg bg-primary-700/50 text-white text-sm"
              >
                {s!.name}
                {s!.role && (
                  <span className="text-accent-400 ml-2">({s!.role})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {material.pageReferences.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Hash className="w-4 h-4" />
            页码标注 ({material.pageReferences.length})
          </div>
          <div className="space-y-3">
            {material.pageReferences.map((ref) => {
              const refChars = ref.characterIds
                .map((id) => characters.find((c) => c.id === id)?.name)
                .filter(Boolean);
              const refStaff = ref.staffIds
                .map((id) => staff.find((s) => s.id === id)?.name)
                .filter(Boolean);

              return (
                <div
                  key={ref.id}
                  className="p-4 rounded-lg bg-primary-800/30 border border-accent-500/10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-400 text-sm font-medium">
                      P.{ref.pageNumber}
                    </span>
                    {ref.description && (
                      <span className="text-white">{ref.description}</span>
                    )}
                  </div>
                  {(refChars.length > 0 || refStaff.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {refChars.map((name) => (
                        <span
                          key={name}
                          className="px-2 py-1 rounded bg-primary-700/50 text-gray-300 text-xs"
                        >
                          {name}
                        </span>
                      ))}
                      {refStaff.map((name) => (
                        <span
                          key={name}
                          className="px-2 py-1 rounded bg-primary-700/50 text-gray-300 text-xs"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {material.copyrightNote && (
        <div className="p-4 rounded-lg bg-primary-800/30">
          <div className="text-gray-400 text-sm mb-2">版权备注</div>
          <div className="text-gray-300 text-sm">{material.copyrightNote}</div>
        </div>
      )}

      <div className="text-xs text-gray-600 pt-4 border-t border-accent-500/10">
        <div>创建时间: {new Date(material.createdAt).toLocaleString('zh-CN')}</div>
        <div>更新时间: {new Date(material.updatedAt).toLocaleString('zh-CN')}</div>
      </div>
    </div>
  );
}
