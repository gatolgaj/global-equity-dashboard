import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  PieChart,
  List,
  FileText,
  HelpCircle,
  X,
  Presentation,
  Radar,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Performance & Risk',
    href: '/performance',
    icon: TrendingUp,
  },
  {
    name: 'Portfolio Composition',
    href: '/composition',
    icon: PieChart,
  },
  {
    name: 'Factor Analysis',
    href: '/factors',
    icon: Radar,
  },
  {
    name: 'Top 50 Holdings',
    href: '/holdings',
    icon: List,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Presentation',
    href: '/presentation',
    icon: Presentation,
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <div className="flex items-center gap-2">
              <img
                src="/terebinth-logo.png"
                alt="Terebinth Capital"
                className="h-8 w-auto"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-gray-100">
            <img
              src="/terebinth-logo.png"
              alt="Terebinth Capital"
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <button className="nav-item w-full">
              <HelpCircle className="w-5 h-5" />
              <span>Help & Support</span>
            </button>

            <div className="mt-4 px-4 py-3 bg-terebinth-light rounded-lg">
              <div className="text-xs font-medium text-terebinth-primary">
                Data Updated
              </div>
              <div className="text-sm text-terebinth-dark mt-1">
                Q3 2025 - Nov 30, 2025
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
