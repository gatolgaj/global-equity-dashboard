import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Settings,
  ChevronDown,
  Upload,
  Calendar,
  LogOut,
} from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useAuthStore } from '../../stores/authStore';
import type { MarketType } from '../../types/portfolio';
import { formatDate } from '../../utils/formatters';

interface HeaderProps {
  onMenuClick: () => void;
  onUploadClick: () => void;
}

export function Header({ onMenuClick, onUploadClick }: HeaderProps) {
  const navigate = useNavigate();
  const { filters, setMarketType, currentSnapshot } = usePortfolioStore();
  const logout = useAuthStore((state) => state.logout);
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const marketTypes: { value: MarketType; label: string }[] = [
    { value: 'DM', label: 'Developed Markets' },
    { value: 'EM', label: 'Emerging Markets' },
    { value: 'COMBINED', label: 'Combined' },
  ];

  const currentMarket = marketTypes.find((m) => m.value === filters.marketType);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/terebinth-logo.png"
              alt="Terebinth Capital"
              className="h-8 w-auto hidden lg:block"
            />
            <div className="lg:hidden w-8 h-8 rounded bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <div className="hidden sm:block lg:hidden">
              <h1 className="text-lg font-semibold text-terebinth-dark">
                Global Equity Dashboard
              </h1>
            </div>
          </div>
        </div>

        {/* Center section - Market selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-terebinth-dark bg-terebinth-light rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span>{currentMarket?.label}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {marketDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMarketDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  {marketTypes.map((market) => (
                    <button
                      key={market.value}
                      onClick={() => {
                        setMarketType(market.value);
                        setMarketDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        filters.marketType === market.value
                          ? 'text-terebinth-primary font-medium bg-terebinth-light'
                          : 'text-gray-700'
                      }`}
                    >
                      {market.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Current date/quarter indicator */}
          {currentSnapshot && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>As of {formatDate(currentSnapshot.date)}</span>
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUploadClick}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Data</span>
          </button>

          <button className="p-2 text-gray-500 hover:text-gray-700 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
