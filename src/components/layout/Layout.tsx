import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { UploadModal } from '../modules/UploadModal';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onUploadClick={() => setUploadModalOpen(true)}
          />

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="px-4 py-3 text-center text-sm text-gray-500 border-t border-gray-200">
            <p>
              &copy; {new Date().getFullYear()} Terebinth Capital. All rights
              reserved. |{' '}
              <span className="text-terebinth-primary">
                Powered by Dendra
              </span>
            </p>
          </footer>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  );
}
