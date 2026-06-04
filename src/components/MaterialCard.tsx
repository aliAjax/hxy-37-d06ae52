import { Edit2, Trash2, Eye, Users, User, Calendar, BookMarked } from 'lucide-react';
import { Material, MaterialTypeLabels, ScanStatusLabels } from '../types';
import { useStore } from '../store/useStore';

interface MaterialCardProps {
  material: Material;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  onView: (material: Material) => void;
}

export function MaterialCard({ material, onEdit, onDelete, onView }: MaterialCardProps) {
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
    <div className="glass rounded-xl overflow-hidden card-hover animate-fade-in group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeIcons[material.type]}</span>
            <div>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-accent-500/20 text-accent-400">
                {MaterialTypeLabels[material.type]}
              </span>
            </div>
          </div>
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${scanStatusColors[material.scanStatus]}`}>
            {ScanStatusLabels[material.scanStatus]}
          </span>
        </div>

        <h3 className="font-serif text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-accent-400 transition-colors">
          {material.title}
        </h3>

        {material.work && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <BookMarked className="w-4 h-4" />
            <span className="truncate">{material.work}</span>
          </div>
        )}

        {material.publishDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Calendar className="w-4 h-4" />
            <span>{material.publishDate}</span>
          </div>
        )}

        <p className="text-sm text-gray-400 line-clamp-2 mb-4">
          {material.description}
        </p>

        {(materialCharacters.length > 0 || materialStaff.length > 0) && (
          <div className="space-y-2 mb-4">
            {materialCharacters.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-500" />
                <div className="flex flex-wrap gap-1">
                  {materialCharacters.slice(0, 3).map((char) => (
                    <span
                      key={char!.id}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary-600/50 text-gray-300"
                    >
                      {char!.name}
                    </span>
                  ))}
                  {materialCharacters.length > 3 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary-600/50 text-gray-400">
                      +{materialCharacters.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {materialStaff.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-accent-500" />
                <div className="flex flex-wrap gap-1">
                  {materialStaff.slice(0, 3).map((s) => (
                    <span
                      key={s!.id}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary-600/50 text-gray-300"
                    >
                      {s!.name}
                    </span>
                  ))}
                  {materialStaff.length > 3 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary-600/50 text-gray-400">
                      +{materialStaff.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-accent-500/10">
          <div className="text-xs text-gray-500">
            <span>{material.pageCount} 页</span>
            {(material.pageStart > 1 || material.pageEnd < material.pageCount) && (
              <span className="ml-2 text-accent-500">
                (P{material.pageStart} - P{material.pageEnd})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(material)}
              className="p-2 rounded-lg hover:bg-primary-600/50 text-gray-400 hover:text-white transition-colors"
              title="查看详情"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(material)}
              className="p-2 rounded-lg hover:bg-primary-600/50 text-gray-400 hover:text-accent-400 transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
