import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { MaterialList } from '@/pages/MaterialList';
import { AdvancedSearch } from '@/pages/AdvancedSearch';
import { ImportExport } from '@/pages/ImportExport';
import { TagManagement } from '@/pages/TagManagement';
import { ScanTasks } from '@/pages/ScanTasks';
import { WishList } from '@/pages/WishList';
import { WorkArchive } from '@/pages/WorkArchive';
import { WorkDetail } from '@/pages/WorkDetail';
import { DuplicateCheck } from '@/pages/DuplicateCheck';
import { DataHealthCheck } from '@/pages/DataHealthCheck';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen noise-texture">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto relative z-10">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/materials" element={<MaterialList />} />
              <Route path="/works" element={<WorkArchive />} />
              <Route path="/works/:workName" element={<WorkDetail />} />
              <Route path="/wishlist" element={<WishList />} />
              <Route path="/scan-tasks" element={<ScanTasks />} />
              <Route path="/search" element={<AdvancedSearch />} />
              <Route path="/import-export" element={<ImportExport />} />
              <Route path="/tags" element={<TagManagement />} />
              <Route path="/duplicate-check" element={<DuplicateCheck />} />
              <Route path="/health-check" element={<DataHealthCheck />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
