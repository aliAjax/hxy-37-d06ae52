import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Library,
  Search,
  Upload,
  Tags,
  BookOpen,
  Scan,
  Star,
  BookMarked,
  Copy,
  Activity
} from 'lucide-react';

const navItems = [
  { path: '/', label: '概览', icon: LayoutDashboard },
  { path: '/works', label: '作品档案', icon: BookMarked },
  { path: '/materials', label: '资料管理', icon: Library },
  { path: '/wishlist', label: '愿望清单', icon: Star },
  { path: '/scan-tasks', label: '扫描任务', icon: Scan },
  { path: '/search', label: '高级检索', icon: Search },
  { path: '/health-check', label: '数据健康检查', icon: Activity },
  { path: '/duplicate-check', label: '重复检查', icon: Copy },
  { path: '/import-export', label: '导入导出', icon: Upload },
  { path: '/tags', label: '标签管理', icon: Tags },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen glass border-r border-accent-500/20 flex flex-col">
      <div className="p-6 border-b border-accent-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-900" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold gradient-text">
              资料档案馆
            </h1>
            <p className="text-xs text-gray-400">Animation Archive</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'text-gray-300 hover:bg-primary-700/50 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-accent-500/20">
        <div className="text-xs text-gray-500 text-center">
          <p>数据本地存储</p>
          <p className="mt-1">请勿清除浏览器缓存</p>
        </div>
      </div>
    </aside>
  );
}
