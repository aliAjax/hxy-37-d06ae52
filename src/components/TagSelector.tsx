import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search } from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  secondary?: string;
}

interface TagSelectorProps {
  label: string;
  availableTags: TagItem[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  onAddNew?: (name: string) => void;
  placeholder?: string;
}

export function TagSelector({
  label,
  availableTags,
  selectedIds,
  onChange,
  onAddNew,
  placeholder = '搜索...',
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number; bottom?: number }>({ top: 0, left: 0, width: 0 });
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTags = availableTags.filter((t) => selectedIds.includes(t.id));
  const filteredTags = availableTags.filter(
    (t) =>
      !selectedIds.includes(t.id) &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.secondary?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 256;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setDropUp(true);
      setDropdownStyle({
        top: 0,
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setDropUp(false);
      setDropdownStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleAddNew = () => {
    if (newTagName.trim() && onAddNew) {
      onAddNew(newTagName.trim());
      setNewTagName('');
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(updateDropdownPosition, 0);
    }
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-[60] rounded-lg bg-primary-800 border border-accent-500/30 shadow-xl max-h-64 overflow-hidden"
      style={{
        top: dropUp ? 'auto' : `${dropdownStyle.top}px`,
        bottom: dropUp ? `${dropdownStyle.bottom}px` : 'auto',
        left: `${dropdownStyle.left}px`,
        width: `${dropdownStyle.width}px`,
      }}
    >
      <div className="p-2 border-b border-accent-500/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 rounded-md bg-primary-900/50 border border-accent-500/20 text-white text-sm input-focus"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="px-4 py-2 hover:bg-accent-500/10 cursor-pointer transition-colors"
              onClick={() => handleToggle(tag.id)}
            >
              <div className="text-white text-sm">{tag.name}</div>
              {tag.secondary && (
                <div className="text-gray-500 text-xs">{tag.secondary}</div>
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-3 text-center text-gray-500 text-sm">
            无匹配结果
          </div>
        )}
      </div>

      {onAddNew && (
        <div className="p-2 border-t border-accent-500/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="添加新标签..."
              className="flex-1 px-3 py-2 rounded-md bg-primary-900/50 border border-accent-500/20 text-white text-sm input-focus"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNew();
                }
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddNew();
              }}
              className="px-3 py-2 rounded-md btn-primary text-primary-900 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      <div ref={containerRef} className="relative">
        <div
          className="min-h-[48px] px-4 py-2 rounded-lg bg-primary-800/50 border border-accent-500/20 cursor-pointer"
          onClick={handleOpen}
        >
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-accent-500/20 text-accent-400"
                >
                  {tag.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(tag.id);
                    }}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-500">点击选择...</span>
          )}
        </div>

        {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
      </div>
    </div>
  );
}
